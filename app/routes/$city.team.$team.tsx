import type { MetaFunction } from '@remix-run/node'
import { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { TeamPerformanceDashboard } from '~/components/TeamPerformanceDashboard'
import { RESULTS_PER_PAGE } from '~/hooks/useTeamResults'
import i18next from '~/i18n/i18next.server'
import { filterAndSortSeries } from '~/lib/utils'
import { storage } from '~/services/storage.server'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }]
}

export const handle = { i18n: 'team' }

export async function loader({ params, request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', ['team', 'common'])

  const url = new URL(request.url)

  const searchParams = {
    citySlug: params.city!,
    seriesSlug: url.searchParams.get('s') || undefined,
    dateFrom: url.searchParams.get('from') || undefined,
    dateTo: url.searchParams.get('to') || undefined,
  }

  const team = await storage.getTeamBySlug(params.team!, (await storage.getCityBySlug(params.city!))!._id)
  if (!team) {
    throw new Response('Team not found', { status: 404 })
  }

  const queryDate =
    !searchParams.dateFrom && !searchParams.dateTo
      ? null
      : {
          from: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
          to: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
        }

  const resultsPromise = storage
    .getMinimalGameResultsByTeam(team._id)
    .then((results) => results.sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime()))

  const seriesPromise = resultsPromise.then((results) =>
    storage.getSeriesById(Array.from(new Set(results.map((res) => res.game_series_id))))
  )

  const dashboard = t('dashboard', { returnObjects: true })
  const selectedSeriesIdPromise = searchParams.seriesSlug
    ? searchParams.seriesSlug === 'all'
      ? Promise.resolve(null)
      : seriesPromise.then((series) => series.find((s) => s.slug === searchParams.seriesSlug)?._id ?? null)
    : Promise.all([resultsPromise, seriesPromise]).then(
        ([results, series]) => filterAndSortSeries(results, series, null).sortedSeries[0].series?._id ?? null
      )

  const resultsForTablePromise = selectedSeriesIdPromise.then((seriesId) => {
    const { seriesSlug, ...rest } = searchParams
    const slugOrId = (seriesSlug && seriesSlug === 'all') || !seriesId ? {} : { seriesId }

    return storage.findTeamResults({
      teamId: team._id,
      ...rest,
      limit: RESULTS_PER_PAGE,
      ...slugOrId,
    })
  })

  return {
    t: { dashboard },
    searchParams,
    results: await resultsPromise,
    series: await seriesPromise,
    resultsForTable: await resultsForTablePromise,
    selectedSeriesId: await selectedSeriesIdPromise,
    queryDate,
    team,
    meta: {
      title: t('meta.title', { teamTitle: team.name }),
      description: t('meta.description', { teamTitle: team.name }),
    },
  }
}

export default function GamesRoute() {
  const { t, results, series, selectedSeriesId, team, resultsForTable, queryDate } = useLoaderData<typeof loader>()

  return (
    <TeamPerformanceDashboard
      team={team}
      results={results}
      series={series}
      selectedDate={queryDate}
      resultsForTable={resultsForTable}
      selectedSeriesId={selectedSeriesId}
      labels={t.dashboard}
    />
  )
}
