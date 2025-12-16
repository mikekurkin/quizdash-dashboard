import { useSearchParams } from '@remix-run/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { City } from '~/schemas/city'
import type { Game, GamesResponse } from '~/schemas/game'
import { GamesResponseSchema } from '~/schemas/game'

export const GAMES_PER_PAGE = 40

export function useGames(currentCity: City, initialData: GamesResponse) {
  const [searchParams] = useSearchParams()
  const initialGames = GamesResponseSchema.strip().parse(initialData)

  return useInfiniteQuery<GamesResponse, Error, Game[]>({
    queryKey: ['games-list', currentCity, searchParams.toString()],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams(searchParams)
      params.set('city', currentCity?.slug ?? '')
      params.set('cursor', String(pageParam))
      params.set('limit', GAMES_PER_PAGE.toString())

      const response = await fetch(`/api/games?${params.toString()}`)
      const data = await response.json()
      return GamesResponseSchema.strip().parse(data)
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: 0,
    initialData: initialGames
      ? {
          pageParams: [0],
          pages: [
            {
              data: initialGames.data,
              nextCursor: initialGames.nextCursor ?? null,
            },
          ],
        }
      : undefined,
    select: (data) => data.pages.flatMap((page) => page.data),
  })
}
