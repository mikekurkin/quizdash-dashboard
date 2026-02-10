import { LoaderFunctionArgs } from '@remix-run/node'
import { TeamsResponseSchema } from '~/schemas/team'
import { storage } from '~/services/storage.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const citySlug = url.searchParams.get('city')
  const cursor = url.searchParams.get('cursor')
  const limit = url.searchParams.get('limit')
  const search = url.searchParams.get('q')
  const sort = url.searchParams.get('sort')
  const order = url.searchParams.get('order')
  const seriesSlug = url.searchParams.get('s')
  const minGamesParam = url.searchParams.get('min_games')
  const minGames = minGamesParam ? Number(minGamesParam) : undefined

  const city = citySlug ? await storage.getCityBySlug(citySlug) : null
  if (citySlug && !city) {
    const response = TeamsResponseSchema.parse({
      data: [],
      nextCursor: null,
    })
    return Response.json(response)
  }

  const teams = await storage.getTeams({
    cityId: city?._id,
    cursor: cursor ? parseInt(cursor) : undefined,
    limit: limit ? parseInt(limit) : 20,
    search: search ?? undefined,
    sort: sort ?? undefined,
    order: order === 'asc' || order === 'desc' ? order : undefined,
    seriesSlug: seriesSlug ?? undefined,
    minGames: Number.isFinite(minGames) ? minGames : undefined,
  })

  const response = TeamsResponseSchema.parse({
    data: teams.data,
    nextCursor: teams.nextCursor ?? null,
  })

  return Response.json(response)
}
