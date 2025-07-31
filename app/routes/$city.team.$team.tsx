import type { MetaFunction } from '@remix-run/node'
import { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useOutletContext } from '@remix-run/react'
import { TeamResultsTable } from '~/components/TeamResultsTable'
import i18next from '~/i18n/i18next.server'
import { storage } from '~/services/storage.server'
import { CityContext } from './$city'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }]
}

export const handle = { i18n: 'games' }

export async function loader({ params, request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', ['team', 'common'])

  const url = new URL(request.url)

  const searchParams = {
    citySlug: params.city!,
    search: url.searchParams.get('q') || undefined,
    dateFrom: url.searchParams.get('from') || undefined,
    dateTo: url.searchParams.get('to') || undefined,
  }

  const team = await storage.getTeamBySlug(params.team!, (await storage.getCityBySlug(params.city!))!._id)
  if (!team) {
    throw new Response('Team not found', { status: 404 })
  }

  const results = (await storage.getGameResultsByTeam(team._id)).sort(
    (a, b) => new Date(b.game.date).getTime() - new Date(a.game.date).getTime()
  )
  // const games = await storage.getGamesByTeam({
  //   teamId: team._id,
  //   ...searchParams,
  //   limit: GAMES_PER_PAGE,
  // })

  const columnHeaders = {
    _id: t('columnHeaders.gameId'),
    'series.name': t('columnHeaders.series'),
    sum: t('columnHeaders.sum'),
    place: t('columnHeaders.place'),
    pack_place: t('columnHeaders.pack_place'),
    number: t('columnHeaders.gameNumber'),
    complexity: t('columnHeaders.complexity'),
    date: t('columnHeaders.date'),
    location: t('columnHeaders.location'),
  }

  return {
    t: {
      title: t('title', { teamTitle: team.name }),
      columnHeaders,
    },
    searchParams,
    results,
    team,
    meta: {
      title: t('meta.title', { teamTitle: team.name }),
      description: t('meta.description', { teamTitle: team.name }),
    },
  }
}

export default function GamesRoute() {
  const { t, results } = useLoaderData<typeof loader>()
  const { currentCity } = useOutletContext<CityContext>()

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between my-6 mx-4 md:mx-0">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        {/* <SearchForm
          query={searchParams.search}
          fromDate={searchParams.dateFrom}
          toDate={searchParams.dateTo}
          label={t.searchLabel}
          searchPlaceholder={t.searchPlaceholder}
          selectDatePlaceholder={t.selectDatePlaceholder}
          className="w-full sm:w-[300px] md:w-[400px]"
        /> */}
      </div>
      <TeamResultsTable currentCity={currentCity} results={results} columnHeaders={t.columnHeaders} />
    </div>
  )
}
