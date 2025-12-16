import { MetaFunction, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { CompactGamesList } from '~/components/CompactGamesList'
import { ComplexityGrade } from '~/components/ComplexityGrade'
import { PackInfo } from '~/components/PackInfo'
import { PackResultsTable } from '~/components/PackResultsTable'
import Card from '~/components/ui/card'
import i18next from '~/i18n/i18next.server'
import { storage } from '~/services/storage.server'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }]
}

export const handle = { i18n: 'pack' } as const

export async function loader({ params }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', [handle.i18n, 'game', 'common'])

  if (params.series === undefined || params.number === undefined) {
    throw new Response('Not Found', { status: 404 })
  }

  const series = await storage.getSeriesBySlug(params.series)

  if (series === null) {
    throw new Response('Not Found', { status: 404 })
  }

  const results = await storage.getGameResultsByPack(series._id, params.number)

  if (results.length === 0) {
    throw new Response('Not Found', { status: 404 })
  }

  const games = await storage.getGamesByPack(series._id, params.number)

  const pack = games[0].pack

  const packTitle = `${series.name} #${params.number}`
  const sortedResults = [...results].sort((a, b) => a.metrics.pack_place - b.metrics.pack_place || a.place - b.place)

  return {
    t: {
      title: t('title', { packTitle }),
      columnHeaders: t('game:columnHeaders', { returnObjects: true }),
      complexityLabels: t('game:complexityLabels', { returnObjects: true, n: pack.metrics.topNAvg.n }),
      infoLabels: t('game:infoLabels', { returnObjects: true, teamsCount: results.length, gamesCount: games.length }),
      packGames: t('packGames'),
    },
    pack,
    packTitle,
    games,
    results: sortedResults,
    meta: {
      title: t('meta.title', { packTitle }),
      description: t('meta.description', { packTitle }),
    },
  }
}

export default function PackRoute() {
  const { t, results, pack, games, packTitle } = useLoaderData<typeof loader>()

  const infoLabels = {
    ...t.infoLabels,
    games:
      games.length % 10 === 1
        ? t.infoLabels.games_one
        : games.length % 10 > 5 || games.length % 10 === 0
          ? t.infoLabels.games_many
          : t.infoLabels.games_few,
    teams:
      results.length % 10 === 1
        ? t.infoLabels.teams_one
        : results.length % 10 > 5 || results.length % 10 === 0
          ? t.infoLabels.teams_many
          : t.infoLabels.teams_few,
  }

  return (
    <>
      <div className="flex flex-row flex-wrap gap-4 items-stretch py-4 max-h-52 overflow-y-auto">
        <Card>
          <PackInfo packTitle={packTitle} labels={infoLabels} />
        </Card>
        {pack.metrics.complexityGrade.sum !== undefined && pack.metrics.prevCount >= 5 && (
          <Card>
            <ComplexityGrade metrics={pack.metrics} labels={t.complexityLabels} />
          </Card>
        )}
        <Card>
          <CompactGamesList heading={<p className="text-muted-foreground/80 mb-1">Игры пакета</p>} games={games} />
        </Card>
      </div>
      <div>
        <PackResultsTable results={results} columnHeaders={t.columnHeaders} />
      </div>
    </>
  )
}
