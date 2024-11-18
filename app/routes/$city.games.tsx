import type { MetaFunction } from '@remix-run/node'
import { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useOutletContext } from '@remix-run/react'
import { GamesTable } from '~/components/GamesTable'
import { SearchForm } from '~/components/SearchForm'
import { GAMES_PER_PAGE } from '~/hooks/useGames'
import i18next from '~/i18n/i18next.server'
import { storage } from '~/services/storage.server'
import { CityContext } from './$city'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }]
}

export const handle = { i18n: 'games' }

export async function loader({ params, request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', ['games', 'common'])

  const url = new URL(request.url)

  const searchParams = {
    citySlug: params.city!,
    search: url.searchParams.get('q') || undefined,
    dateFrom: url.searchParams.get('from') || undefined,
    dateTo: url.searchParams.get('to') || undefined,
  }

  const games = await storage.getGames({
    ...searchParams,
    limit: GAMES_PER_PAGE,
  })

  const columnHeaders = {
    _id: t('table.gameId'),
    'series.name': t('table.series'),
    number: t('table.gameNumber'),
    complexity: t('table.complexity'),
    date: t('table.date'),
    location: t('table.location'),
  }

  return {
    t: {
      title: t('title'),
      endOfResults: t('endOfResults'),
      noResults: t('noResults'),
      columnHeaders,
      searchLabel: t('search.label'),
      searchPlaceholder: t('search.placeholder'),
      selectDatePlaceholder: t('datePicker.placeholder'),
    },
    searchParams,
    games: {
      data: games.data,
      nextCursor: games.nextCursor,
    },
    meta: {
      title: t('meta.title'),
      description: t('meta.description'),
    },
  }
}

export default function GamesRoute() {
  const { t, searchParams, games } = useLoaderData<typeof loader>()
  const { currentCity } = useOutletContext<CityContext>()

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between my-6 mx-4 md:mx-0">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <SearchForm
          query={searchParams.search}
          fromDate={searchParams.dateFrom}
          toDate={searchParams.dateTo}
          label={t.searchLabel}
          searchPlaceholder={t.searchPlaceholder}
          selectDatePlaceholder={t.selectDatePlaceholder}
          className="w-full sm:w-[300px] md:w-[400px]"
        />
      </div>
      <GamesTable
        currentCity={currentCity}
        initialGames={games}
        columnHeaders={t.columnHeaders}
        endOfResults={t.endOfResults}
        noResults={t.noResults}
      />
    </div>
  )
}
