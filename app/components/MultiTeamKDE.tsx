import { InfoIcon } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { cn, estimateDensities } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Team } from '~/schemas/team'
import Card from './ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/mobile-tooltip'

export type MultiTeamKDELabels = {
  title: string
  description: string
  tooltip: {
    value: string
  }
}

type MetricKey = 'sum' | 'place'

type TeamResults = {
  team: Team
  results: MinimalGameResult[]
}

export const MultiTeamKDE = memo(function MultiTeamKDE({
  className,
  teams,
  labels,
  metric,
  maxValue,
  teamColors,
}: {
  className?: string
  teams: TeamResults[]
  labels: MultiTeamKDELabels
  metric: MetricKey
  maxValue: number
  teamColors: Record<string, string>
}) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const { team } of teams) {
      config[team.slug] = {
        label: team.name,
        color: teamColors[team.slug],
      }
    }
    return config
  }, [teams, teamColors])

  const data = useMemo(() => {
    if (maxValue <= 0) return []
    const range = { min: 1, max: Math.max(1, Math.ceil(maxValue)) }
    const base = Array.from({ length: range.max - range.min + 1 }, (_, i) => ({
      value: range.min + i,
    })) as Array<{ value: number } & Record<string, number>>

    for (const { team, results } of teams) {
      const densities = estimateDensities(
        results.map((r) => ({ sum: r.sum, place: r.place })),
        [metric],
        range
      )
      for (let i = 0; i < densities.length; i++) {
        const density = densities[i]?.[`${metric}_density` as const] ?? 0
        base[i]![team.slug] = density
      }
    }

    return base
  }, [teams, metric, maxValue])

  const tooltipValueFormatter = useCallback(
    (value: unknown) =>
      typeof value === 'number'
        ? `${(value * 100).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f%`
        : String(value),
    []
  )

  const tooltipLabelFormatter = useCallback(
    (_: unknown, payloadMaybe?: unknown) => {
      const payloadArray = Array.isArray(payloadMaybe) ? payloadMaybe : []
      const first = payloadArray[0] as { payload?: { value?: number } } | undefined
      const xValue = first?.payload?.value
      if (xValue === undefined) return ''
      return `${labels.tooltip.value}: ${xValue}`
    },
    [labels]
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
      <CardContent className="px-2 py-0 pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <LineChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="value"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              domain={[1, Math.max(1, Math.ceil(maxValue))]}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <ChartTooltip
              cursor={true}
              content={
                  <ChartTooltipContent
                    indicator="dot"
                    valueFormatter={tooltipValueFormatter}
                    labelFormatter={tooltipLabelFormatter}
                  />
                }
              />
            {teams.map(({ team }) => (
              <Line
                key={team._id}
                dataKey={team.slug}
                type="natural"
                stroke={`var(--color-${team.slug})`}
                dot={false}
                strokeWidth={2}
                isAnimationActive
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
