import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { BarChart3, InfoIcon } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { cn } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Team } from '~/schemas/team'
import Card from './ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/mobile-tooltip'

export interface MultiTeamRoundsLabels {
  title: string
  description: string
  tooltip: {
    max: string
    average: string
  }
  roundSuffix: string
  placeholder: string
}

type TeamResults = {
  team: Team
  results: MinimalGameResult[]
}

export const MultiTeamRounds = memo(function MultiTeamRounds({
  className,
  seriesRounds,
  teams,
  labels,
  teamColors,
}: {
  className?: string
  seriesRounds?: number[]
  teams: TeamResults[]
  labels: MultiTeamRoundsLabels
  teamColors: Record<string, string>
}) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      maximum: {
        label: labels.tooltip.max,
        color: 'hsl(var(--chart-1) / 0.4)',
      },
    }

    for (const { team } of teams) {
      config[team.slug] = {
        label: team.name,
        color: teamColors[team.slug],
      }
    }

    return config
  }, [teams, labels, teamColors])

  const teamRoundAverages = useMemo(() => {
    const averagesByTeam = new Map<string, number[]>()

    for (const { team, results } of teams) {
      if (results.length === 0) {
        averagesByTeam.set(team.slug, [])
        continue
      }

      const maxRounds = Math.max(...results.map((r) => r.rounds.length))
      const averages: number[] = []

      for (let roundIndex = 0; roundIndex < maxRounds; roundIndex++) {
        const roundScores = results
          .map((r) => r.rounds[roundIndex])
          .filter((score) => score !== undefined && score !== null)

        if (roundScores.length > 0) {
          const average = roundScores.reduce((sum, score) => sum + score, 0) / roundScores.length
          averages.push(Math.round(average * 100) / 100)
        } else {
          averages.push(0)
        }
      }

      averagesByTeam.set(team.slug, averages)
    }

    return averagesByTeam
  }, [teams])

  const isPlaceholder = seriesRounds === undefined
  const chartData = useMemo(() => {
    if (!seriesRounds) return []
    return seriesRounds.map((roundSum, index) => {
      const row: Record<string, number | string> = {
        round: index + 1,
        maximum: roundSum,
        label: roundSum.toLocaleString('ru-RU'),
      }

      for (const { team } of teams) {
        const average = teamRoundAverages.get(team.slug)?.[index]
        if (average !== undefined) {
          row[team.slug] = average
        }
      }

      return row
    })
  }, [seriesRounds, teams, teamRoundAverages])

  const tooltipLabelFormatter = useCallback((_: unknown, payload: unknown) => {
    if (!Array.isArray(payload)) return ''
    const first = payload.at(0) as { payload?: { round?: number } } | undefined
    const round = first?.payload?.round
    if (round === undefined) return ''
    return `${round} ${labels.roundSuffix}`
    return ''
  }, [labels.roundSuffix])

  const tooltipValueFormatter = useCallback(
    (value: unknown, item: unknown) => {
      const payload = (item as { payload?: { maximum?: number } })?.payload
      const max = payload?.maximum
      if (typeof value !== 'number' || typeof max !== 'number') {
        return typeof value === 'number'
          ? value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
          : String(value)
      }

      const avg = value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const maxFormatted = max.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
      return `${avg} / ${maxFormatted}`
    },
    []
  )

  const tooltipContent = useCallback(
    (props: unknown) => {
      const p = props as { payload?: unknown }
      const payload = Array.isArray(p.payload) ? p.payload : []
      const averages = payload.filter((item) => String((item as { dataKey?: string }).dataKey) !== 'maximum')

      return (
        <ChartTooltipContent
          {...(props as Record<string, unknown>)}
          payload={averages}
          labelFormatter={tooltipLabelFormatter}
          valueFormatter={tooltipValueFormatter}
          itemIndicator={() => 'dot'}
        />
      )
    },
    [tooltipLabelFormatter, tooltipValueFormatter]
  )

  return (
    <Card className={cn('pt-0', className)}>
      <CardHeader className="flex flex-row gap-2 space-y-0 py-0 pt-5">
        <CardTitle>{labels.title}</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="bg-card rounded-sm p-2 text-muted-foreground text-xs border text-pretty w-64">
              {labels.description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <div className="relative">
        <div className={cn(isPlaceholder && 'blur-sm opacity-50')}>
          <CardContent className="px-2 py-0 pt-4">
            <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
              {(() => {
                const maxBarSize = 110
                const gap = 4
                const teamCount = Math.max(1, teams.length)
                const avgBarSize = Math.max(10, Math.floor((maxBarSize - gap * (teamCount - 1)) / teamCount))
                return (
                  <BarChart accessibilityLayer data={chartData} barCategoryGap="30%" barGap={gap}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="round" tickLine={false} tickMargin={10} axisLine={false} xAxisId="max" />
                <XAxis dataKey="round" tickLine={false} tickMargin={10} axisLine={false} xAxisId="avg" hide />
                <YAxis dataKey="maximum" domain={[0, 'dataMax+2']} hide />
                <ChartTooltip content={tooltipContent} />
                <Bar
                  dataKey="maximum"
                  xAxisId="max"
                  fill="var(--color-maximum)"
                  radius={[4, 4, 0, 0]}
                  barSize={maxBarSize}
                  isAnimationActive={!isPlaceholder}
                >
                  <LabelList dataKey="label" position="top" offset={12} className="fill-foreground" fontSize={12} />
                </Bar>
                {teams.map(({ team }) => (
                  <Bar
                    key={team._id}
                    dataKey={team.slug}
                    xAxisId="avg"
                    fill={`var(--color-${team.slug})`}
                    stroke={`var(--color-${team.slug})`}
                    strokeOpacity={0.9}
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                    barSize={avgBarSize}
                    fillOpacity={0.45}
                    isAnimationActive={!isPlaceholder}
                  />
                ))}
              </BarChart>
                )
              })()}
            </ChartContainer>
          </CardContent>
        </div>
        {isPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
              <div className="text-sm text-muted-foreground/60">{labels.placeholder}</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
})
