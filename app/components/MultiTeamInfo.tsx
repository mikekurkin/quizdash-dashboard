import { Link } from '@remix-run/react'
import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Team } from '~/schemas/team'
import Card from './ui/card'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'

export interface MultiTeamInfoLabels {
  title: string
  team: string
  games: string
  avgResult: string
  avgPlace: string
  bestResult: string
  empty: string
}

type TeamResults = {
  team: Team
  results: MinimalGameResult[]
}

function calculateStats(results: MinimalGameResult[]) {
  if (results.length === 0) {
    return {
      games: 0,
      avgSum: null as number | null,
      avgPlace: null as number | null,
      best: null as MinimalGameResult | null,
    }
  }

  let best = results[0]
  let sumTotal = 0
  let placeTotal = 0

  for (const result of results) {
    sumTotal += result.sum
    placeTotal += result.place
    if (result.sum > best.sum) best = result
  }

  return {
    games: results.length,
    avgSum: sumTotal / results.length,
    avgPlace: placeTotal / results.length,
    best,
  }
}

export function MultiTeamInfo({
  className,
  teams,
  selectedSeriesId,
  labels,
  series,
}: {
  className?: string
  teams: TeamResults[]
  selectedSeriesId: string | null
  labels: MultiTeamInfoLabels
  series: { _id: string; maxRoundSums: number[] }[]
}) {
  const seriesTotals = useMemo(
    () =>
      new Map(series.map((item) => [item._id, item.maxRoundSums.reduce((sum, value) => sum + value, 0)])),
    [series]
  )
  const rows = useMemo(
    () =>
      teams.map(({ team, results }) => {
        const metrics = team.metrics
        const seriesMetrics = selectedSeriesId ? metrics?.series?.[selectedSeriesId] : undefined

        if (metrics) {
          const gamesCount = seriesMetrics?.gamesCount ?? metrics.gamesCount
          const avgSum = seriesMetrics?.avgSum ?? metrics.avgSum
          const avgPlace = seriesMetrics?.avgPlace ?? metrics.avgPlace
          const bestSum = seriesMetrics?.bestSum ?? metrics.bestSum
          const bestGameId = seriesMetrics?.bestGameId ?? metrics.bestGameId
          const bestSeriesId = selectedSeriesId ?? metrics.bestSeriesId ?? null

          const stats =
            gamesCount > 0
              ? {
                  games: gamesCount,
                  avgSum,
                  avgPlace,
                  best: bestSum && bestGameId ? { sum: bestSum, gameId: bestGameId, seriesId: bestSeriesId } : null,
                }
              : {
                  games: 0,
                  avgSum: null,
                  avgPlace: null,
                  best: null,
                }

          return {
            team,
            stats,
          }
        }

        const filtered = selectedSeriesId ? results.filter((r) => r.game_series_id === selectedSeriesId) : results
        const calculated = calculateStats(filtered)
        return {
          team,
          stats: {
            games: calculated.games,
            avgSum: calculated.avgSum,
            avgPlace: calculated.avgPlace,
            best: calculated.best
              ? { sum: calculated.best.sum, gameId: calculated.best.game_id, seriesId: calculated.best.game_series_id }
              : null,
          },
        }
      }),
    [teams, selectedSeriesId]
  )

  return (
    <Card className={cn('pt-0', className)}>
      <CardHeader className="flex flex-row gap-2 space-y-0 py-0 pt-5">
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 py-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b">
                <th className="py-1.5 text-left font-medium pr-2">{labels.team}</th>
                <th className="py-1.5 text-right font-medium">{labels.games}</th>
                <th className="py-1.5 text-right font-medium">{labels.avgResult}</th>
                <th className="py-1.5 text-right font-medium">{labels.avgPlace}</th>
                <th className="py-1.5 text-right font-medium">{labels.bestResult}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="py-4 text-center text-muted-foreground" colSpan={5}>
                    {labels.empty}
                  </td>
                </tr>
              ) : (
                rows.map(({ team, stats }) => {
                  const citySlug = team.city?.slug
                  const teamHref = citySlug ? `/${citySlug}/team/${team.slug}` : undefined
                  const bestGameId = stats.best ? stats.best.gameId : null
                  const bestSeriesId = stats.best ? stats.best.seriesId : null
                  const bestSum = stats.best ? stats.best.sum : null
                  const bestHref = citySlug && bestGameId ? `/${citySlug}/game/${bestGameId}` : undefined
                  const seriesTotal = bestSeriesId ? seriesTotals.get(bestSeriesId) : undefined
                  const isTotal = seriesTotal !== undefined && bestSum === seriesTotal

                  return (
                    <tr key={team._id} className="border-b last:border-b-0">
                      <td className="py-1.5 text-left font-medium pr-2">
                        {teamHref ? (
                          <Link to={teamHref} className="hover:underline decoration-dotted">
                            <span className="truncate block" title={team.name}>
                              {team.name}
                            </span>
                          </Link>
                        ) : (
                          <span className="truncate block" title={team.name}>
                            {team.name}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-right">{stats.games}</td>
                      <td className="py-1.5 text-right">
                        {stats.avgSum === null
                          ? labels.empty
                          : stats.avgSum.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-1.5 text-right">
                        {stats.avgPlace === null
                          ? labels.empty
                          : stats.avgPlace.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-1.5 text-right">
                        {bestSum !== null ? (
                          bestHref ? (
                            <Link
                              to={bestHref}
                              className={cn(
                                'hover:underline decoration-dotted inline-flex items-center rounded-sm px-1 py-0.5',
                                isTotal && 'bg-yellow-400 text-foreground dark:text-primary-foreground'
                              )}
                            >
                              {bestSum.toLocaleString('ru-RU', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                            </Link>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-sm px-1 py-0.5',
                                isTotal && 'bg-yellow-400 text-foreground dark:text-primary-foreground'
                              )}
                            >
                              {bestSum.toLocaleString('ru-RU', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                            </span>
                          )
                        ) : (
                          labels.empty
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
