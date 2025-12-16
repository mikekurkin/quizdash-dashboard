import { json, type ActionFunctionArgs } from '@remix-run/node'
import { getDataSourceConfig } from '~/config/environment.server'
import { storage } from '~/services/storage.server'

/**
 * Route handler for refreshing data from GitHub
 *
 * This route can be called to refresh data when new commits are pushed to the repository.
 * It can be triggered:
 * 1. Manually by visiting /api/refresh-data
 * 2. Programmatically via a GitHub webhook (with proper authentication)
 * 3. Via automated CI/CD pipeline
 */
export async function action({ request }: ActionFunctionArgs) {
  // Only allow POST requests to refresh data
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 })
  }

  const config = getDataSourceConfig()

  // Check if we're configured to use GitHub data
  if (config.type !== 'github') {
    return json(
      {
        success: false,
        error: 'GitHub data source not configured',
        dataSource: config.type,
      },
      { status: 400 }
    )
  }

  try {
    // Read the request body to check for GitHub webhook payload
    const body = await request.json().catch(() => null)

    // Simple validation for GitHub webhook - this can be enhanced with proper signature validation
    const isGitHubWebhook = request.headers.get('X-GitHub-Event') === 'push'
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET

    // If webhook secret is configured, validate it
    if (isGitHubWebhook && webhookSecret) {
      const signature = request.headers.get('X-Hub-Signature-256')
      if (!signature) {
        return json({ success: false, error: 'Missing signature' }, { status: 401 })
      }

      // Note: For a production app, you would implement proper HMAC validation here
      // This is a simplified version
      if (!signature.startsWith('sha256=')) {
        return json({ success: false, error: 'Invalid signature format' }, { status: 401 })
      }
    }

    // Only refresh if this is the configured branch
    if (isGitHubWebhook && body?.ref) {
      const branch = `refs/heads/${config.github?.branch || 'main'}`
      if (body.ref !== branch) {
        return json({
          success: false,
          message: `Ignoring push to ${body.ref}, only monitoring ${branch}`,
          skipRefresh: true,
        })
      }
    }

    // Perform the actual data refresh
    const refreshResult = await storage.refreshData()

    if (refreshResult) {
      return json({
        success: true,
        message: 'Data refreshed successfully',
        timestamp: new Date().toISOString(),
      })
    } else {
      return json(
        {
          success: false,
          error: 'Failed to refresh data',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error refreshing data:', error)
    return json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * Loader function to provide a simple UI for manual refresh
 */
export async function loader() {
  const config = getDataSourceConfig()
  return json({
    dataSource: config.type,
    isGitHub: config.type === 'github',
    dataDir: config.dataDir,
    message: 'To refresh data, send a POST request to this endpoint',
  })
}
