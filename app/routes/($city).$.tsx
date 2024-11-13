import { LoaderFunctionArgs } from '@remix-run/node'

export function loader({ request }: LoaderFunctionArgs) {
  // Return empty response for source map requests
  if (request.url.endsWith('.js.map')) {
    return Response.json(null, { status: 200 })
  }

  // Return 404 for other unmatched routes
  throw Response.json({ message: 'Not Found' }, { status: 404 })
}
