import { MetaFunction, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { CompactGamesList } from '~/components/CompactGamesList'
import { ComplexityGrade } from '~/components/ComplexityGrade'
import { GameInfo } from '~/components/GameInfo'
import { GameResultsTable } from '~/components/GameResultsTable'
import Card from '~/components/ui/card'
import i18next from '~/i18n/i18next.server'
import { storage } from '~/services/storage.server'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }]
}

export const handle = { i18n: 'game' } as const

export async function loader({ params }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', [handle.i18n, 'common'])

  if (params.id === undefined || isNaN(parseInt(params.id))) {
    throw new Response('Not Found', { status: 404 })
  }

  const gameId = params.id
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
      infoLabels: t('infoLabels', { returnObjects: true, teamsCount: results.length, gamesCount: 1 }),
      otherPackGames: t('otherPackGames'),
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

  const infoLabels = {
    ...t.infoLabels,
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
          <GameInfo game={game} labels={infoLabels} />
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
                <p className="text-muted-foreground/80 mb-1">
                  {t.otherPackGames + ' '}
                  <Link
                    to={`/${game.city.slug}/pack/${game.series.slug}/${game.pack.number}`}
                    className="text-foreground/80 font-medium hover:underline hover:text-muted-foreground decoration-dotted"
                  >
                    #{game.pack.number}
                  </Link>
                </p>
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
