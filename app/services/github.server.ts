/**
 * GitHub service for fetching data files from a repository using Octokit
 *
 * This implementation uses several error-proofing techniques:
 * 1. Request throttling - automatically handles rate limits with exponential backoff
 * 2. Request retries - automatically retries failed requests with configurable limits
 * 3. Path normalization - prevents URL encoding issues when accessing GitHub API
 * 4. Robust error handling - detailed error reporting for easier debugging
 * 5. Type safety - properly typed interfaces and error handling
 */
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'
import { RequestError } from '@octokit/request-error'
import { Octokit } from '@octokit/rest'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import path from 'path'

// Extend Octokit with plugins for better error handling
const EnhancedOctokit = Octokit.plugin(throttling, retry)

interface GitHubConfig {
  owner: string
  repo: string
  branch: string
  token?: string
  path: string
}

// Interface for GitHub content items
interface GitHubContentItem {
  name: string
  path: string
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string | null
}

// Interface for Git LFS pointer data
interface GitLFSPointer {
  version: string
  oid: string
  size: number
}

export class GitHubService {
  private config: GitHubConfig
  private octokit: Octokit

  constructor(config: GitHubConfig) {
    this.config = config

    // Create Octokit instance with throttling and retry plugins
    this.octokit = new EnhancedOctokit({
      auth: config.token,
      throttle: {
        onRateLimit: (retryAfter, options) => {
          console.warn(`Request quota exhausted for request ${options.method} ${options.url}`)

          // Retry twice by default
          if (options.request.retryCount < 2) {
            console.info(`Retrying after ${retryAfter} seconds!`)
            return true
          }
          return false
        },
        onSecondaryRateLimit: (retryAfter, options) => {
          console.warn(`Secondary rate limit hit for request ${options.method} ${options.url}`)

          // Retry twice by default
          if (options.request.retryCount < 2) {
            console.info(`Retrying after ${retryAfter} seconds!`)
            return true
          }
          return false
        },
      },
      retry: {
        doNotRetry: ['400', '401', '403', '404', '422'],
        retries: 3,
      },
    })
  }

  /**
   * Check if a response contains a Git LFS pointer
   */
  private isLFSPointer(data: string): boolean {
    return data.startsWith('version https://git-lfs.github.com/spec/v1') && data.includes('oid sha256:')
  }

  /**
   * Parse Git LFS pointer data
   */
  private parseLFSPointer(data: string): GitLFSPointer | null {
    try {
      const lines = data.trim().split('\n')
      const version = lines[0].split(' ')[1]
      const oidLine = lines[1].split(' ')
      const oid = oidLine[1].split(':')[1]
      const size = parseInt(lines[2].split(' ')[1], 10)

      return { version, oid, size }
    } catch (error) {
      console.error('Error parsing LFS pointer:', error)
      return null
    }
  }

  /**
   * Fetch the actual content for a Git LFS file
   */
  private async fetchLFSContent(pointer: GitLFSPointer): Promise<Uint8Array> {
    const { owner, repo } = this.config

    try {
      console.log(`Fetching LFS content: ${owner}/${repo} (oid: ${pointer.oid})`)

      // The correct URL format for GitHub LFS objects
      const downloadUrl = `https://github.com/${owner}/${repo}.git/lfs/objects/${pointer.oid}`

      // Fetch the raw content directly
      const response = await fetch(downloadUrl, {
        headers: this.config.token
          ? {
              Authorization: `token ${this.config.token}`,
              Accept: 'application/vnd.git-lfs',
            }
          : {
              Accept: 'application/vnd.git-lfs',
            },
      })

      if (!response.ok) {
        // If direct access fails, try the batch API approach
        if (response.status === 404) {
          console.log('Direct LFS access failed, trying batch API approach...')
          return await this.fetchLFSContentViaBatchAPI(pointer)
        }
        throw new Error(`Failed to fetch LFS content: ${response.status} ${response.statusText}`)
      }

      // Get the binary data
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } catch (error) {
      console.error('Error fetching LFS content:', error)
      throw new Error(`Failed to download LFS file: ${error}`)
    }
  }

  /**
   * Fallback method to fetch LFS content using the batch API
   */
  private async fetchLFSContentViaBatchAPI(pointer: GitLFSPointer): Promise<Uint8Array> {
    const { owner, repo } = this.config

    try {
      // LFS batch API endpoint
      const batchUrl = `https://github.com/${owner}/${repo}.git/info/lfs/objects/batch`

      // Request object download URL using batch API
      const batchResponse = await fetch(batchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.git-lfs+json',
          ...(this.config.token ? { Authorization: `token ${this.config.token}` } : {}),
        },
        body: JSON.stringify({
          operation: 'download',
          objects: [{ oid: pointer.oid, size: pointer.size }],
          transfers: ['basic'],
        }),
      })

      if (!batchResponse.ok) {
        throw new Error(`LFS batch API request failed: ${batchResponse.status} ${batchResponse.statusText}`)
      }

      const batchData = await batchResponse.json()

      // Extract the download URL from the response
      if (
        !batchData.objects ||
        !batchData.objects[0] ||
        !batchData.objects[0].actions ||
        !batchData.objects[0].actions.download
      ) {
        throw new Error('LFS batch API response did not contain download URL')
      }

      const downloadObj = batchData.objects[0].actions.download
      const downloadUrl = downloadObj.href
      const downloadHeaders = downloadObj.header || {}

      // Download the actual content
      const contentResponse = await fetch(downloadUrl, {
        headers: {
          ...downloadHeaders,
          ...(this.config.token ? { Authorization: `token ${this.config.token}` } : {}),
        },
      })

      if (!contentResponse.ok) {
        throw new Error(`Failed to download LFS content: ${contentResponse.status} ${contentResponse.statusText}`)
      }

      const arrayBuffer = await contentResponse.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } catch (error) {
      console.error('Error in LFS batch API fallback:', error)
      throw new Error(`Failed to download LFS file via batch API: ${error}`)
    }
  }

  /**
   * Get the contents of a file from GitHub
   */
  private async getFileContents(filePath: string): Promise<{ data: Uint8Array; url: string }> {
    const { owner, repo, branch } = this.config

    // Normalize path properly
    const fullPath = this.normalizePath(filePath)

    try {
      console.log(`Fetching GitHub content: ${owner}/${repo}/${fullPath} (branch: ${branch})`)

      // First request metadata/content (no raw) so we can branch based on availability
      const meta = await this.octokit.repos.getContent({
        owner,
        repo,
        path: fullPath,
        ref: branch,
      })

      if (Array.isArray(meta.data)) {
        throw new Error(`Path refers to a directory, not a file: ${fullPath}`)
      }

      // meta.data is a file descriptor
      const fileData = meta.data as unknown as {
        type: string
        size: number
        sha: string
        encoding?: string
        content?: string
        download_url?: string | null
      }

      // Case 1: Content is included in API response (<= 1MB), base64 encoded
      if (fileData.content && fileData.encoding === 'base64') {
        const asBytes = this.decodeBase64ToUint8Array(fileData.content)
        const asText = new TextDecoder().decode(asBytes)

        // If it's an LFS pointer, fetch the actual LFS content
        if (this.isLFSPointer(asText)) {
          const pointer = this.parseLFSPointer(asText)
          if (!pointer) {
            throw new Error(`Failed to parse LFS pointer for ${fullPath}`)
          }
          const lfsData = await this.fetchLFSContent(pointer)
          return { data: lfsData, url: meta.url }
        }

        // Regular file (non-LFS), return decoded bytes
        return { data: asBytes, url: meta.url }
      }

      // Case 2: No inline content (likely large file). Try download_url first.
      if (fileData.download_url) {
        const res = await fetch(fileData.download_url, {
          headers: this.config.token ? { Authorization: `token ${this.config.token}` } : undefined,
        })
        if (!res.ok) {
          throw new Error(`Failed to download file via download_url: ${res.status} ${res.statusText}`)
        }
        const buf = new Uint8Array(await res.arrayBuffer())
        return { data: buf, url: meta.url }
      }

      // Case 3: Fallback to Git blob API to retrieve content (base64)
      const blob = await this.octokit.git.getBlob({ owner, repo, file_sha: fileData.sha })
      if (!('content' in blob.data) || typeof blob.data.content !== 'string') {
        throw new Error('Unexpected blob response format')
      }
      const blobBytes = this.decodeBase64ToUint8Array(blob.data.content)
      const blobText = new TextDecoder().decode(blobBytes)
      if (this.isLFSPointer(blobText)) {
        const pointer = this.parseLFSPointer(blobText)
        if (!pointer) {
          throw new Error(`Failed to parse LFS pointer from blob for ${fullPath}`)
        }
        const lfsData = await this.fetchLFSContent(pointer)
        return { data: lfsData, url: meta.url }
      }
      return { data: blobBytes, url: meta.url }
    } catch (error) {
      this.handleError(error, `Error getting file contents for ${fullPath}:`)
      throw error
    }
  }

  /**
   * Checks if a file has changed on GitHub compared to the local version
   */
  private async hasFileChanged(githubPath: string, localPath: string): Promise<boolean> {
    try {
      // Check if local file exists
      if (!existsSync(localPath)) {
        console.log(`Local file doesn't exist, download required: ${localPath}`)
        return true
      }

      // Get local file stats
      const localStats = statSync(localPath)
      const localSize = localStats.size
      const localMtime = localStats.mtimeMs

      // Get remote file metadata
      const { owner, repo, branch } = this.config
      const fullPath = this.normalizePath(githubPath)

      console.log(`Checking if file has changed: ${fullPath}`)
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path: fullPath,
        ref: branch,
      })

      // For arrays (directories), we don't have a direct comparison
      if (Array.isArray(response.data)) {
        console.log(`Received directory listing instead of file metadata for ${fullPath}`)
        return true
      }

      // Get SHA and size from GitHub response
      const fileData = response.data as { sha: string; size: number }
      const remoteSize = fileData.size

      // Determine if file is an LFS pointer by inspecting the blob content
      try {
        const blob = await this.octokit.git.getBlob({
          owner: this.config.owner,
          repo: this.config.repo,
          file_sha: fileData.sha,
        })
        if ('content' in blob.data && typeof blob.data.content === 'string') {
          const blobText = new TextDecoder().decode(this.decodeBase64ToUint8Array(blob.data.content))
          if (this.isLFSPointer(blobText)) {
            const pointer = this.parseLFSPointer(blobText)
            if (pointer) {
              const lfsMetadataPath = `${localPath}.lfs-metadata.json`
              let needsUpdate = true

              if (existsSync(lfsMetadataPath)) {
                try {
                  const storedMetadata = JSON.parse(readFileSync(lfsMetadataPath, 'utf8'))
                  if (storedMetadata.oid === pointer.oid && storedMetadata.size === pointer.size) {
                    console.log(`LFS file ${fullPath} has not changed (matching oid)`)
                    needsUpdate = false
                  }
                } catch (error) {
                  console.error(`Error reading LFS metadata: ${error}`)
                }
              }

              if (needsUpdate) {
                console.log(`LFS file ${fullPath} has changed or metadata not found`)
                return true
              }
              return false
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to inspect blob for ${fullPath}, falling back to size/time checks`)
      }

      // For regular files, check if size is different (basic check)
      if (remoteSize !== localSize) {
        console.log(`File ${fullPath} size changed (local: ${localSize}, remote: ${remoteSize})`)
        return true
      }

      // If size is the same, compare by modified time vs. our last download time
      // Assuming GitHub API response includes last commit date
      const lastModified = new Date(response.headers['last-modified'] || 0).getTime()

      // If remote file is newer than our local file, download it
      if (lastModified > localMtime) {
        console.log(`File ${fullPath} has been modified on GitHub since last download`)
        return true
      }

      console.log(`File ${fullPath} has not changed, skipping download`)
      return false
    } catch (error) {
      // Log error but default to downloading the file to be safe
      console.error(`Error checking if file has changed, will download to be safe: ${githubPath}`, error)
      return true
    }
  }

  /**
   * Downloads a file from GitHub and saves it to the local filesystem
   */
  public async downloadFile(githubPath: string, localPath: string): Promise<string> {
    try {
      // Check if file has changed before downloading
      const fileChanged = await this.hasFileChanged(githubPath, localPath)

      if (!fileChanged) {
        console.log(`📝 Skipping unchanged file: ${githubPath}`)
        return localPath
      }

      // Get file contents with LFS support
      const { data } = await this.getFileContents(githubPath)

      // Create directory if it doesn't exist
      const dir = path.dirname(localPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      // Save file to disk
      writeFileSync(localPath, data)
      console.log(`📥 Downloaded ${githubPath} to ${localPath}`)

      // If this is an LFS file, save metadata for future comparisons
      const rawMeta = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: this.normalizePath(githubPath),
        ref: this.config.branch,
      })
      if (!Array.isArray(rawMeta.data)) {
        const blob = await this.octokit.git.getBlob({
          owner: this.config.owner,
          repo: this.config.repo,
          file_sha: rawMeta.data.sha,
        })
        if ('content' in blob.data && typeof blob.data.content === 'string') {
          const text = new TextDecoder().decode(this.decodeBase64ToUint8Array(blob.data.content))
          if (this.isLFSPointer(text)) {
            const pointer = this.parseLFSPointer(text)
            if (pointer) {
              writeFileSync(
                `${localPath}.lfs-metadata.json`,
                JSON.stringify(
                  {
                    oid: pointer.oid,
                    size: pointer.size,
                    version: pointer.version,
                    downloadTime: new Date().toISOString(),
                  },
                  null,
                  2
                )
              )
            }
          }
        }
      }

      return localPath
    } catch (error) {
      this.handleError(error, `Error downloading file ${githubPath}:`)
      throw error
    }
  }

  /**
   * List files in a directory from GitHub
   */
  async listFiles(directoryPath: string = ''): Promise<string[]> {
    try {
      const { owner, repo, branch } = this.config

      // Normalize the path
      const fullPath = this.normalizePath(directoryPath)

      console.log(`Listing GitHub contents: ${owner}/${repo}/${fullPath || '(root)'} (branch: ${branch})`)

      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path: fullPath,
        ref: branch,
      })

      if (!Array.isArray(response.data)) {
        console.warn(`Expected directory contents for path ${fullPath}, got a file`)
        return []
      }

      return (response.data as GitHubContentItem[])
        .filter((item: GitHubContentItem) => item.type === 'file')
        .map((item: GitHubContentItem) => item.name)
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        console.warn(`Directory not found: ${directoryPath}`)
        return []
      }

      this.handleError(error, 'Error listing files:')
      return []
    }
  }

  /**
   * Download all CSV files from a GitHub repository to a local directory
   */
  async syncDataDirectory(localDir: string): Promise<boolean> {
    try {
      console.log(`Syncing data directory from GitHub to ${localDir}`)

      // Create the directory if it doesn't exist
      if (!existsSync(localDir)) {
        console.log(`Creating directory: ${localDir}`)
        mkdirSync(localDir, { recursive: true })
      }

      // List files from repository
      console.log(`Listing files from GitHub repository: ${this.config.owner}/${this.config.repo}`)
      const files = await this.listFiles()

      if (files.length === 0) {
        console.warn(
          `No files found in GitHub repository. Check if the repository path '${this.config.path}' is correct.`
        )
        return false
      }

      const csvFiles = files.filter((file) => file.endsWith('.csv'))
      console.log(`Found ${files.length} files, ${csvFiles.length} CSV files`)

      if (csvFiles.length === 0) {
        console.warn('No CSV files found in GitHub repository')
        return false
      }

      // Download all CSV files sequentially to avoid race conditions
      console.log(`Downloading ${csvFiles.length} CSV files...`)

      // Track successful and failed downloads
      const successfulDownloads: string[] = []
      const failedDownloads: { file: string; error: unknown }[] = []

      // Download files one at a time to ensure reliable completion
      for (const file of csvFiles) {
        const destinationPath = path.join(localDir, file)
        console.log(`Downloading: ${file} to ${destinationPath}`)

        try {
          // Wait for each file to complete before starting the next
          await this.downloadFile(file, destinationPath)

          // Verify the file exists and has contents
          if (existsSync(destinationPath)) {
            successfulDownloads.push(file)
          } else {
            throw new Error(`File was not created after download: ${destinationPath}`)
          }
        } catch (error) {
          console.error(`Error downloading file ${file}:`, error)
          failedDownloads.push({ file, error })
        }
      }

      // Report results
      console.log(`Downloaded ${successfulDownloads.length} files successfully`)

      if (failedDownloads.length > 0) {
        console.error(`Failed to download ${failedDownloads.length} files`)
        failedDownloads.forEach(({ file, error }) => {
          console.error(`  - ${file}: ${error instanceof Error ? error.message : String(error)}`)
        })
        return false
      }

      console.log(`Data sync complete - all ${csvFiles.length} files downloaded successfully`)
      return true
    } catch (error) {
      this.handleError(error, 'Error syncing data directory:')
      return false
    }
  }

  /**
   * Normalize a path for GitHub API requests
   */
  private normalizePath(inputPath: string): string {
    // Start with the base path if it exists
    let fullPath = this.config.path ? `${this.config.path}/${inputPath}` : inputPath

    // Replace multiple slashes with a single slash
    fullPath = fullPath.replace(/\/+/g, '/')

    // Remove any leading slash
    fullPath = fullPath.replace(/^\//, '')

    // If path is empty after normalization, return empty string
    if (fullPath === '/') return ''

    return fullPath
  }

  /**
   * Decode a base64 string into a Uint8Array
   */
  private decodeBase64ToUint8Array(base64: string): Uint8Array {
    return Uint8Array.from(Buffer.from(base64, 'base64'))
  }

  /**
   * Handle errors in a standardized way
   */
  private handleError(error: unknown, prefix: string = ''): void {
    if (error instanceof RequestError) {
      console.error(`${prefix} ${error.message}`)
      console.error(`Status: ${error.status}`)

      if (error.response) {
        console.error(`Response data: ${JSON.stringify(error.response.data)}`)

        // Handle rate limiting
        if (error.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = error.response.headers['x-ratelimit-reset']
          if (resetTime) {
            const resetDate = new Date(parseInt(resetTime) * 1000)
            console.error(`Rate limit exceeded. Resets at ${resetDate.toLocaleString()}`)
          }
        }

        // Handle secondary rate limits
        if (error.status === 403 && error.response.headers['retry-after']) {
          const retryAfter = error.response.headers['retry-after']
          console.error(`Secondary rate limit hit. Retry after ${retryAfter} seconds`)
        }
      }
    } else if (error instanceof Error) {
      console.error(`${prefix} ${error.message}`)
      console.error(`Stack: ${error.stack}`)
    } else {
      console.error(`${prefix} Unknown error:`, error)
    }
  }
}

// Create a GitHub service from environment variables
export function createGitHubService(): GitHubService | null {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH || 'main'
  const token = process.env.GITHUB_TOKEN
  const path = process.env.GITHUB_PATH || ''

  // Log configuration (with token redacted)
  console.log('GitHub configuration:')
  console.log(`- Owner: ${owner || '(not set)'}`)
  console.log(`- Repository: ${repo || '(not set)'}`)
  console.log(`- Branch: ${branch}`)
  console.log(`- Path: ${path ? path : '(root)'}`)
  console.log(`- Token: ${token ? 'Provided (redacted)' : '(not set)'}`)

  if (!owner || !repo) {
    console.error('GitHub configuration is incomplete:')
    if (!owner) console.error('- GITHUB_OWNER environment variable is not set')
    if (!repo) console.error('- GITHUB_REPO environment variable is not set')
    console.error('Please check your environment variables')
    return null
  }

  return new GitHubService({ owner, repo, branch, token, path })
}
