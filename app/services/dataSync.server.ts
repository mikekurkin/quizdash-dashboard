/**
 * Data synchronization service for managing data updates from external sources
 */
import path from 'path'
import { getDataSourceConfig } from '~/config/environment.server'
import { createGitHubService } from './github.server'

// Get data directory from environment configuration
const config = getDataSourceConfig()
const DATA_DIR = path.join(process.cwd(), config.dataDir)

export class DataSyncService {
  private dataSourceConfig = config

  /**
   * Initialize data based on configured data source
   */
  public async initializeData(): Promise<void> {
    if (this.dataSourceConfig.type === 'github') {
      await this.syncDataFromGitHub()
    }
  }

  /**
   * Sync data from GitHub repository
   */
  public async syncDataFromGitHub(): Promise<boolean> {
    if (this.dataSourceConfig.type !== 'github') {
      console.log('Data source is not GitHub, skipping sync')
      return false
    }

    const githubService = createGitHubService()
    if (!githubService) {
      console.error('GitHub service is not properly configured')
      return false
    }

    try {
      console.log('Syncing data from GitHub repository')
      const success = await githubService.syncDataDirectory(DATA_DIR)

      if (success) {
        console.log('Data sync successful')
      }

      return success
    } catch (error) {
      console.error('Error syncing data from GitHub:', error)
      return false
    }
  }
}

// Create singleton instance
export const dataSyncService = new DataSyncService()
