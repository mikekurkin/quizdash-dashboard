import { useSearchParams } from '@remix-run/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { City } from '~/schemas/city'
import { GameResult, GameResultsResponse, GameResultsResponseSchema } from '~/schemas/gameResult'

export const RESULTS_PER_PAGE = 40

export function useTeamResults(
  currentCity: City | null,
  initialData: GameResultsResponse,
  teamId: string,
  seriesId: string
) {
  const [searchParams] = useSearchParams()
  const initialResults = GameResultsResponseSchema.strip().parse(initialData)

  const query = useInfiniteQuery<GameResultsResponse, Error, GameResult[]>({
    queryKey: ['team-results', currentCity, teamId, seriesId, searchParams.toString()],

    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams(searchParams)
      params.set('city', currentCity?.slug ?? '')
      params.set('t', teamId)
      params.delete('s')
      if (seriesId) params.set('s', seriesId)
      params.set('cursor', String(pageParam))
      params.set('limit', RESULTS_PER_PAGE.toString())

      const response = await fetch(`/api/team-results?${params.toString()}`)
      const data = await response.json()
      return GameResultsResponseSchema.strip().parse(data)
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: 0,
    initialData: initialResults
      ? {
          pageParams: [0],
          pages: [
            {
              data: initialResults.data,
              nextCursor: initialResults.nextCursor ?? null,
            },
          ],
        }
      : undefined,
    select: (data) => data.pages.flatMap((page) => page.data),
    refetchOnMount: 'always',
    staleTime: 0,
  })

  return query
}
