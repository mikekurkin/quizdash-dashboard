import { CsvStorage } from '~/storage/csv.server'

// Create a singleton instance of storage that will be used throughout the app
export const storage = new CsvStorage()

// Export the type for use in other files
export type StorageInstance = CsvStorage
