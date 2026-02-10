import { useSearchParams } from '@remix-run/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { City } from '~/schemas/city'
import type { TeamsResponse } from '~/schemas/team'
import { TeamsResponseSchema } from '~/schemas/team'

export const TEAMS_PER_PAGE = 40

export function useTeams(currentCity: City, initialData: TeamsResponse) {
  const [searchParams] = useSearchParams()
  const initialTeams = TeamsResponseSchema.strip().parse(initialData)

  return useInfiniteQuery<TeamsResponse, Error, TeamsResponse['data']>({
    queryKey: ['teams-list', currentCity, searchParams.toString()],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams(searchParams)
      params.set('city', currentCity?.slug ?? '')
      params.set('cursor', String(pageParam))
      params.set('limit', TEAMS_PER_PAGE.toString())
      const sort = params.get('sort') ?? 'games'
      if (!['games', 'sum_total', 'avg_sum', 'best_sum'].includes(sort)) {
        params.set('sort', 'games')
      }
      params.set('order', 'desc')
      if (sort === 'avg_sum') {
        params.set('min_games', '5')
      } else {
        params.delete('min_games')
      }

      const response = await fetch(`/api/teams?${params.toString()}`)
      const data = await response.json()
      return TeamsResponseSchema.strip().parse(data)
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: 0,
    initialData: initialTeams
      ? {
          pageParams: [0],
          pages: [
            {
              data: initialTeams.data,
              nextCursor: initialTeams.nextCursor ?? null,
            },
          ],
        }
      : undefined,
    select: (data) => data.pages.flatMap((page) => page.data),
  })
}
