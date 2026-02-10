import { Link } from '@remix-run/react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Award, Gamepad2, Target, Trophy } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { cn } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Series } from '~/schemas/series'
import { Team } from '~/schemas/team'
import Card from './ui/card'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'
import { DateRangePicker } from './ui/date-range-picker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export interface TeamInfoLabels {
  gamesCount: string
  datePickerPlaceholder: string
  avgResult: string
  avgPlace: string
  bestResult: string
  atAll: string
  inSeries: string
}

function findMaxResult(results: MinimalGameResult[] | undefined) {
  if (!results?.length) return null
  return results.reduce((max, r) => (r.sum > max.sum ? r : max), results[0])
}

export const TeamInfo = ({
  className,
  team,
  results,
  filteredResults,
  date,
  setDate,
  labels,
  series,
  seriesId,
}: {
  className?: string
  team: Team
  results: MinimalGameResult[]
  filteredResults: MinimalGameResult[] | null
  date: DateRange | null
  setDate: (date: DateRange | null) => void
  labels: TeamInfoLabels
  series: Series[]
  seriesId?: string | null
}) => {
  const useMetrics = team.metrics && !date
  const seriesMetrics = useMetrics && seriesId ? team.metrics?.series?.[seriesId] : undefined

  const overall = useMetrics
    ? {
        games: team.metrics!.gamesCount,
        avgSum: team.metrics!.avgSum,
        avgPlace: team.metrics!.avgPlace,
      }
    : {
        games: results.length,
        avgSum: results.length > 0 ? results.reduce((sum, r) => sum + r.sum, 0) / results.length : 0,
        avgPlace: results.length > 0 ? results.reduce((sum, r) => sum + r.place, 0) / results.length : 0,
      }

  const inSeries = useMetrics && seriesId
    ? {
        games: seriesMetrics?.gamesCount ?? 0,
        avgSum: seriesMetrics?.avgSum ?? 0,
        avgPlace: seriesMetrics?.avgPlace ?? 0,
      }
    : {
        games: filteredResults?.length ?? 0,
        avgSum:
          filteredResults && filteredResults.length > 0
            ? filteredResults.reduce((sum, r) => sum + r.sum, 0) / filteredResults.length
            : 0,
        avgPlace:
          filteredResults && filteredResults.length > 0
            ? filteredResults.reduce((sum, r) => sum + r.place, 0) / filteredResults.length
            : 0,
      }

  return (
    <Card className={cn('pt-0 px-2', className)}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b py-5 justify-between">
        <CardTitle className="text-2xl">{team.name}</CardTitle>
        <DateRangePicker
          initialDate={date ?? undefined}
          onDateChange={(value) => setDate(value ?? null)}
          align="end"
          selectDatePlaceholder={labels.datePickerPlaceholder}
        />
      </CardHeader>
      <CardContent className="space-y-2 py-2 px-0 sm:px-2">
        <div className="flex items-center justify-between py-1 px-3">
          <div className="w-24"></div>
          <div className="flex items-center gap-3">
            <div className="text-right w-24">
              <span className="text-xs text-muted-foreground font-medium">{labels.atAll}</span>
            </div>
            <div className="text-right w-16">
              <span className="text-xs text-muted-foreground font-medium">{labels.inSeries}</span>
            </div>
          </div>
        </div>

        {/* Games Count */}
        <div className="flex items-center justify-between py-1 px-3 bg-muted/20 rounded-md">
          <div className="flex items-center gap-2 w-auto">
            <Gamepad2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{labels.gamesCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right w-16">
              <span className="text-sm font-medium">{overall.games}</span>
            </div>
            <div className="text-right w-16">
              <span className="text-sm font-medium text-primary">
                {filteredResults === null ? '-' : inSeries.games}
              </span>
            </div>
          </div>
        </div>

        {/* Average Results */}
        <div className="flex items-center justify-between py-1 px-3 bg-muted/20 rounded-md">
          <div className="flex items-center gap-2 w-auto">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{labels.avgResult}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right w-16">
              <span className="text-sm font-medium">
                {overall.avgSum.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </div>
            <div className="text-right w-16">
              <span className="text-sm font-medium text-primary">
                {!filteredResults
                  ? '-'
                  : inSeries.avgSum.toLocaleString('ru-RU', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
              </span>
            </div>
          </div>
        </div>

        {/* Placement */}
        <div className="flex items-center justify-between py-1 px-3 bg-muted/20 rounded-md">
          <div className="flex items-center gap-2 w-auto">
            <Award className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{labels.avgPlace}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right w-16">
              <span className="text-sm font-medium">
                {overall.avgPlace.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="text-right w-16">
              <span className="text-sm font-medium text-primary">
                {!filteredResults
                  ? '-'
                  : inSeries.avgPlace.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Best Results */}
        <div className="flex items-center justify-between py-1 px-3 bg-muted/20 rounded-md">
          <div className="flex items-center gap-2 w-auto">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{labels.bestResult}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Overall best */}
            <div className="text-right w-16">
              <span className="text-sm font-medium">
                {(() => {
                  const maxRes = findMaxResult(results)
                  if (!maxRes) return 0

                  const maxResSeries = series.find((s) => s._id === maxRes.game_series_id) as Series | undefined

                  const value = maxRes.sum.toLocaleString('ru-RU', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })

                  const isTotal = maxResSeries && maxResSeries.maxRoundSums.reduce((a, b) => a + b) === maxRes.sum

                  const citySlug = team.city?.slug
                  const href = citySlug ? `/${citySlug}/game/${maxRes.game_id}` : undefined
                  const tooltipText = `${series.find((s) => s._id === maxRes.game_series_id)?.name} ${maxRes.pack_formatted} · ${format(maxRes.game_date, 'dd MMMM yyyy', { locale: ru })}`

                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-block rounded-sm px-1 py-0.5 -mx-1 -my-0.5',
                              isTotal && 'bg-yellow-400 text-foreground dark:text-primary-foreground'
                            )}
                          >
                            {href ? (
                              <Link
                                prefetch="intent"
                                to={href}
                                className="text-sm font-medium hover:underline decoration-dotted"
                              >
                                {value}
                              </Link>
                            ) : (
                              value
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="z-20 bg-card text-card-foreground border">
                          {tooltipText}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })()}
              </span>
            </div>
            <div className="text-right w-16">
              <span className="text-sm font-medium text-primary">
                {(() => {
                  if (!filteredResults) return '-'
                  const maxRes = findMaxResult(filteredResults)
                  if (!maxRes) return 0

                  const maxResSeries = series.find((s) => s._id === maxRes.game_series_id) as Series | undefined

                  const value = maxRes.sum.toLocaleString('ru-RU', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })

                  const citySlug = team.city?.slug
                  const href = citySlug ? `/${citySlug}/game/${maxRes.game_id}` : undefined
                  const isTotal = maxResSeries && maxResSeries.maxRoundSums.reduce((a, b) => a + b) === maxRes.sum
                  const tooltipText = `${maxResSeries?.name} ${maxRes.pack_formatted} · ${format(maxRes.game_date, 'dd MMMM yyyy', { locale: ru })}`

                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-block rounded-sm px-1 py-0.5 -mx-1 -my-0.5',
                              isTotal && 'bg-yellow-400 text-foreground dark:text-primary-foreground'
                            )}
                          >
                            {href ? (
                              <Link
                                prefetch="intent"
                                to={href}
                                className="text-sm font-medium hover:underline decoration-dotted"
                              >
                                {value}
                              </Link>
                            ) : (
                              value
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="z-20 bg-card text-card-foreground border">
                          {tooltipText}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
