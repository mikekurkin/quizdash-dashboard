import { MetaFunction, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { ComplexityGrade } from '~/components/ComplexityGrade'
import { GameResultsTable } from '~/components/GameResultsTable'
import Card from '~/components/ui/card'
import i18next from '~/i18n/i18next.server'
import { storage } from '~/services/storage.server'
import { CompactGamesList } from '~/components/CompactGamesList'
import { GameInfo } from '~/components/GameInfo'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }]
}

export const handle = { i18n: 'game' } as const

export async function loader({ params }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', [handle.i18n, 'common'])

  if (params.id === undefined || isNaN(parseInt(params.id))) {
    throw new Response('Not Found', { status: 404 })
  }

  const gameId = parseInt(params.id)
  const game = await storage.getGameById(gameId)

  if (game === null) {
    throw new Response('Not Found', { status: 404 })
  }

  const results = await storage.getGameResults(gameId)
  const gameTitle = `${game.series.name} ${game.pack.formatted}`

  const packGames = await storage.getGamesByPack(game.series._id, game.pack.number)
  const otherPackGames = packGames.filter((g) => g._id !== game._id)

  return {
    t: {
      title: t('title', { gameTitle }),
      columnHeaders: t('columnHeaders', { returnObjects: true }),
      complexityLabels: t('complexityLabels', { returnObjects: true, n: game.pack.metrics.topNAvg.n }),
      infoLabels: t('infoLabels', { returnObjects: true }),
    },
    game,
    results,
    otherPackGames,
    meta: {
      title: t('meta.title', { gameTitle }),
      description: t('meta.description', { gameTitle }),
    },
  }
}

export default function GameRoute() {
  const { t, game, results, otherPackGames } = useLoaderData<typeof loader>()

  return (
    <>
      <div className="flex flex-row flex-wrap gap-4 items-stretch py-4 max-h-52 overflow-y-scroll">
        <Card>
          <GameInfo game={game} teamsCount={results.length} labels={t.infoLabels} />
        </Card>
        {game.pack.metrics.complexityGrade.sum !== undefined && game.pack.metrics.prevCount >= 5 && (
          <Card>
            <ComplexityGrade metrics={game.pack.metrics} labels={t.complexityLabels} />
          </Card>
        )}
        {otherPackGames.length > 0 && (
          <Card>
            <CompactGamesList
              heading={
                <div className="flex items-center justify-between text-sm mb-2">
                  <Link
                    to={`/${game.city.slug}/pack/${game.series.slug}/${game.pack.number}`}
                    className="hover:underline hover:text-muted-foreground decoration-dotted text-l font-bold mb-0"
                  >
                    Пакет #{game.pack.number}
                  </Link>
                  <div className="text-sm text-muted-foreground/80 italic">другие игры:</div>
                </div>
              }
              games={otherPackGames}
            />
          </Card>
        )}
      </div>
      <div>
        <GameResultsTable results={results} columnHeaders={t.columnHeaders} />
      </div>
    </>
  )
}
