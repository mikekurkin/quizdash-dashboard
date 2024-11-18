import { statSync } from 'fs'
import path from 'path'

export class CsvCache<T, R> {
  private cache: {
    data: T
    timestamp: number
    transformedData: Map<string, any>
  } | null = null

  private pendingRequest: Promise<T> | null = null

  constructor(
    private filename: string,
    private dataDir: string
  ) {}

  async get(getData: () => Promise<R>, transformData: (rawData: R) => Promise<T> | T): Promise<T> {
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

        return data
      } finally {
        // Clear pending request after completion (success or failure)
        this.pendingRequest = null
      }
    })()

    return this.pendingRequest
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
}
