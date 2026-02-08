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
        const filtered = selectedSeriesId ? results.filter((r) => r.game_series_id === selectedSeriesId) : results
        const stats = calculateStats(filtered)

        return {
          team,
          stats,
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
                  const bestHref =
                    citySlug && stats.best ? `/${citySlug}/game/${stats.best.game_id}` : undefined
                  const seriesTotal = stats.best ? seriesTotals.get(stats.best.game_series_id) : undefined
                  const isTotal = seriesTotal !== undefined && stats.best?.sum === seriesTotal

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
                        {stats.best ? (
                          bestHref ? (
                            <Link
                              to={bestHref}
                              className={cn(
                                'hover:underline decoration-dotted inline-flex items-center rounded-sm px-1 py-0.5',
                                isTotal && 'bg-yellow-400 text-foreground dark:text-primary-foreground'
                              )}
                            >
                              {stats.best.sum.toLocaleString('ru-RU', {
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
                              {stats.best.sum.toLocaleString('ru-RU', {
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
