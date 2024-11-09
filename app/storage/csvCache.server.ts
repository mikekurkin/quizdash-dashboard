import { statSync } from 'fs';
import path from 'path';

export class CsvCache<T, R> {
  private cache: {
    data: T;
    timestamp: number;
  } | null = null;

  constructor(private filename: string, private dataDir: string) {}

  async get(getData: () => Promise<R>, transformData: (rawData: R) => Promise<T> | T): Promise<T> {
    const filePath = path.join(this.dataDir, this.filename);
    const fileStats = statSync(filePath);
    const currentMtime = fileStats.mtimeMs;

    // Return cached data if valid
    if (this.cache && this.cache.timestamp === currentMtime) {
      return this.cache.data;
    }

    // Get fresh data
    const rawData = await getData();
    const data = await transformData(rawData);

    // Update cache
    this.cache = {
      data,
      timestamp: currentMtime,
    };

    return data;
  }

  invalidate() {
    this.cache = null;
  }
}
