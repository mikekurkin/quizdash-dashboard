import { LoaderFunctionArgs } from '@remix-run/node'
import { GameResultsResponseSchema } from '~/schemas/gameResult'
import { storage } from '~/services/storage.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const citySlug = url.searchParams.get('city')
  const teamId = url.searchParams.get('t')
  const seriesId = url.searchParams.get('s')
  const cursor = url.searchParams.get('cursor')
  const limit = url.searchParams.get('limit')
  const search = url.searchParams.get('q')
  const dateFrom = url.searchParams.get('from')
  const dateTo = url.searchParams.get('to')

  const results =
    teamId === null
      ? { data: [] }
      : await storage.findTeamResults({
          teamId,
          seriesId: seriesId ?? undefined,
          citySlug: citySlug!,
          cursor: cursor ? parseInt(cursor) : undefined,
          limit: limit ? parseInt(limit) : 20,
          search: search ?? undefined,
          dateFrom: dateFrom ?? undefined,
          dateTo: dateTo ?? undefined,
        })

  // Parse and validate the response
  const response = GameResultsResponseSchema.parse({
    data: results.data,
    nextCursor: results.nextCursor ?? null,
  })

  // Add artificial delay in development to simulate network latency
  // if (process.env.NODE_ENV === 'development') {
  //   await new Promise(resolve => setTimeout(resolve, 1000));
  // }

  return Response.json(response)
}
