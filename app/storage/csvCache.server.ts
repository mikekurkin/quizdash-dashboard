import { existsSync, statSync } from 'fs'
import path from 'path'

export type IndexConfig<T> = {
  [indexName: string]: (item: T) => string | number
}

export class CsvCache<T, R> {
  private cache: {
    data: T
    timestamp: number
    transformedData: Map<string, unknown>
  } | null = null

  private pendingRequest: Promise<T> | null = null
  private dataInitialized = false

  // Index support
  private indexes: Map<string, Map<string, T[]>> = new Map()
  private indexConfig: IndexConfig<T> | null = null

  constructor(
    private filename: string,
    private dataDir: string,
    indexConfig?: IndexConfig<T>
  ) {
    this.indexConfig = indexConfig || null
  }

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

  /**
   * Build indexes for the given data
   */
  private buildIndexes(data: T[]): void {
    if (!this.indexConfig) return

    // Clear existing indexes
    this.indexes.clear()

    // Build each configured index
    for (const [indexName, keyExtractor] of Object.entries(this.indexConfig)) {
      const index = new Map<string, T[]>()

      for (const item of data) {
        const key = String(keyExtractor(item))
        if (!index.has(key)) {
          index.set(key, [])
        }
        index.get(key)!.push(item)
      }

      this.indexes.set(indexName, index)
    }
  }

  /**
   * Build indexes from transformed data (for use after transformation)
   */
  public buildIndexesFromData(data: T[]): void {
    this.buildIndexes(data)
  }

  /**
   * Get data by index lookup
   */
  async getByIndex(
    getData: () => Promise<R>,
    transformData: (rawData: R) => Promise<T> | T,
    indexName: string,
    indexValue: string | number
  ): Promise<T[]> {
    if (!this.indexConfig || !this.indexConfig[indexName]) {
      throw new Error(`Index '${indexName}' not configured for ${this.filename}`)
    }

    // Get the full dataset (this will build indexes if needed)
    await this.get(getData, transformData)

    // Return indexed results
    const index = this.indexes.get(indexName)
    return index?.get(String(indexValue)) || []
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

          // Build indexes if configured - AFTER transformation
          if (Array.isArray(data) && this.indexConfig) {
            this.buildIndexes(data)
          }

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
    this.indexes.clear()
  }

  isInitialized(): boolean {
    return this.dataInitialized
  }
}
