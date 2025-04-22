/**
 * Environment configuration for the application
 *
 * This file provides configuration based on environment variables.
 * If no environment variables are set, it will use default values.
 */

export interface DataSourceConfig {
  type: 'local' | 'github'
  dataDir: string
  github?: {
    owner: string
    repo: string
    branch: string
    token?: string
    path: string
  }
}

export function getDataSourceConfig(): DataSourceConfig {
  // Default to local data directory
  const dataSourceType = process.env.DATA_SOURCE_TYPE || 'local'
  const localDataDir = process.env.LOCAL_DATA_DIR || 'data'

  // Create config object based on data source type
  if (dataSourceType === 'github') {
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO
    const branch = process.env.GITHUB_BRANCH || 'main'
    const token = process.env.GITHUB_TOKEN
    const path = process.env.GITHUB_PATH || ''

    // If GitHub configuration is incomplete, fall back to local
    if (!owner || !repo) {
      console.warn('Incomplete GitHub configuration, falling back to local data directory')
      return {
        type: 'local',
        dataDir: localDataDir,
      }
    }

    return {
      type: 'github',
      dataDir: process.env.GITHUB_LOCAL_CACHE_DIR || '.data/github',
      github: {
        owner,
        repo,
        branch,
        token,
        path,
      },
    }
  }

  // Default to local data directory
  return {
    type: 'local',
    dataDir: localDataDir,
  }
}
