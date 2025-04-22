import { existsSync, statSync } from 'fs'
import path from 'path'

export class CsvCache<T, R> {
  private cache: {
    data: T
    timestamp: number
    transformedData: Map<string, unknown>
  } | null = null

  private pendingRequest: Promise<T> | null = null
  private dataInitialized = false

  constructor(
    private filename: string,
    private dataDir: string
  ) {}

  /**
   * Checks if the required file exists and is accessible
   */
  private fileExists(): boolean {
    const filePath = path.join(this.dataDir, this.filename)
    return existsSync(filePath)
  }

  /**
   * Waits for the file to exist with retries
   */
  private async waitForFile(maxRetries = 30, retryDelayMs = 500): Promise<boolean> {
    if (this.fileExists()) {
      return true
    }

    console.log(`Waiting for file to be ready: ${this.filename}`)

    for (let i = 0; i < maxRetries; i++) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      if (this.fileExists()) {
        console.log(`File is now available after ${i + 1} retries: ${this.filename}`)
        return true
      }
    }

    console.error(`File not available after ${maxRetries} retries: ${this.filename}`)
    return false
  }

  async get(getData: () => Promise<R>, transformData: (rawData: R) => Promise<T> | T): Promise<T> {
    try {
      // Wait for file to exist (with retries) before attempting to read it
      const fileExists = await this.waitForFile()
      if (!fileExists) {
        throw new Error(`Required file not found: ${this.filename}`)
      }

      const filePath = path.join(this.dataDir, this.filename)
      const fileStats = statSync(filePath)
      const currentMtime = Math.floor(fileStats.mtimeMs) // Round down to prevent floating point issues

      if (this.cache && Math.floor(this.cache.timestamp) === currentMtime) {
        return this.cache.data
      }

      if (this.pendingRequest) {
        return this.pendingRequest
      }

      this.pendingRequest = (async () => {
        try {
          // Get fresh data
          const getStart = performance.now()
          const rawData = await getData()
          const getTime = (performance.now() - getStart) / 1000
          const transformStart = performance.now()
          const data = await transformData(rawData)
          const transformTime = (performance.now() - transformStart) / 1000

          console.log(String(this.filename), 'get', getTime.toFixed(2), 's', 'transform', transformTime.toFixed(2), 's')

          // Update cache with new Map for transformed data
          this.cache = {
            data,
            timestamp: currentMtime,
            transformedData: new Map(),
          }

          // Mark as initialized once we've successfully loaded data
          this.dataInitialized = true

          return data
        } finally {
          // Clear pending request after completion (success or failure)
          this.pendingRequest = null
        }
      })()

      return this.pendingRequest
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error accessing cache for ${this.filename}:`, error)
      throw new Error(`Failed to access data for ${this.filename}: ${errorMessage}`)
    }
  }

  async getTransformed<K>(key: string, transform: (data: T) => Promise<K> | K): Promise<K> {
    if (!this.cache) {
      throw new Error('Cache not initialized')
    }

    const cached = this.cache.transformedData.get(key)
    if (cached) {
      return cached as K
    }

    const transformed = await transform(this.cache.data)
    this.cache.transformedData.set(key, transformed)
    return transformed
  }

  invalidate() {
    this.cache = null
  }

  isInitialized(): boolean {
    return this.dataInitialized
  }
}
