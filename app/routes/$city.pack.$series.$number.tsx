import { MetaFunction, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { ComplexityGrade } from '~/components/ComplexityGrade'
import { PackResultsTable } from '~/components/PackResultsTable'
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

  const games = results.map((r) => r.game)

  const pack = games[0].pack

  const packTitle = `${series.name} #${params.number}`
  const sortedResults = [...results].sort((a, b) => a.metrics.pack_place - b.metrics.pack_place || a.place - b.place)

  return {
    t: {
      title: t('title', { packTitle }),
      columnHeaders: t('game:columnHeaders', { returnObjects: true }),
      complexityLabels: t('game:complexityLabels', { returnObjects: true, n: pack.metrics.topNAvg.n }),
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
  const { t, results, pack, packTitle } = useLoaderData<typeof loader>()
  return (
    
      <>
        <div className="flex flex-row gap-4 items-stretch py-4">
          <div className="p-4 border rounded-lg w-[300px] flex flex-col">
            <h1 className="text-2xl font-bold mb-4">{packTitle}</h1>
            <div className="text-sm text-muted-foreground">
              {/* <div>Date: {new Date(game.date).toLocaleDateString()}</div>
              <div>Location: {game.location}</div> */}
            </div>
          </div>
          {pack.metrics.complexityGrade.sum !== undefined && pack.metrics.prevCount >= 5 && (
            <ComplexityGrade
              metrics={pack.metrics}
              className="p-4 border rounded-lg w-[300px] flex flex-col"
              labels={t.complexityLabels}
            />
          )}
        </div>
        <div>
          <PackResultsTable results={results} columnHeaders={t.columnHeaders} />
        </div>
      </>
    
  )
}
