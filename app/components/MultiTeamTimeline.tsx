import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { InfoIcon } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { addLowess, cn } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Team } from '~/schemas/team'
import Card from './ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export type MultiTeamTimelineLabels = {
  title: string
  description: string
  trendTitle: string
  tooltip: {
    date: string
  }
}

type TeamResults = {
  team: Team
  results: MinimalGameResult[]
}

type MetricKey = 'sum' | 'place'

export const MultiTeamTimeline = memo(function MultiTeamTimeline({
  className,
  teams,
  labels,
  metric,
  maxValue,
  teamColors,
}: {
  className?: string
  teams: TeamResults[]
  labels: MultiTeamTimelineLabels
  metric: MetricKey
  maxValue?: number
  teamColors: Record<string, string>
}) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const { team } of teams) {
      config[team.slug] = {
        label: team.name,
        color: teamColors[team.slug],
      }
      config[`${team.slug}_lowess`] = {
        label: team.name,
        color: teamColors[team.slug],
      }
    }
    return config
  }, [teams, teamColors])

  const data = useMemo(() => {
    const dataMap = new Map<number, Record<string, number | undefined>>()
    const countMap = new Map<number, Record<string, number>>()
    const perTeamRaw: Record<string, { date: number; value: number }[]> = {}

    for (const { team, results } of teams) {
      const key = team.slug
      perTeamRaw[key] = []

      for (const result of results) {
        const date = result.game_date.getTime()
        const dataPoint = dataMap.get(date) ?? { date }
        const counts = countMap.get(date) ?? {}

        dataPoint[key] = (dataPoint[key] ?? 0) + (result[metric] ?? 0)
        counts[key] = (counts[key] ?? 0) + 1

        dataMap.set(date, dataPoint)
        countMap.set(date, counts)
        perTeamRaw[key].push({ date, value: result[metric] ?? 0 })
      }
    }

    const merged = Array.from(dataMap.values()).map((row) => {
      const date = row.date as number
      const counts = countMap.get(date) ?? {}
      for (const key of Object.keys(row)) {
        if (key === 'date') continue
        const count = counts[key] ?? 1
        const avg = typeof row[key] === 'number' ? (row[key] as number) / count : row[key]
        row[key] = avg
      }
      return row
    })

    const withLowess = merged.map((row) => ({ ...row }))

    for (const key of Object.keys(perTeamRaw)) {
      const points = perTeamRaw[key] ?? []
      if (points.length <= 1) continue
      const sortedPoints = points.slice().sort((a, b) => a.date - b.date)
      const smoothed = addLowess(
        sortedPoints.map((p) => ({ date: p.date, value: p.value })),
        ['value'],
        { sorted: true }
      )

      const lowessByDate = new Map<number, { sum: number; count: number }>()
      for (const point of smoothed) {
        const entry = lowessByDate.get(point.date) ?? { sum: 0, count: 0 }
        entry.sum += point.value_lowess
        entry.count += 1
        lowessByDate.set(point.date, entry)
      }

      const smoothedByDate = Array.from(lowessByDate.entries())
        .map(([date, entry]) => ({ date, value: entry.sum / entry.count }))
        .sort((a, b) => a.date - b.date)

      for (const row of withLowess) {
        const date = row.date as number
        if (smoothedByDate.length === 0) continue
        if (date < smoothedByDate[0]!.date) {
          continue
        }
        if (date >= smoothedByDate[smoothedByDate.length - 1]!.date) {
          row[`${key}_lowess`] = smoothedByDate[smoothedByDate.length - 1]!.value
          continue
        }

        let i = 0
        while (i < smoothedByDate.length - 1 && smoothedByDate[i + 1]!.date < date) i++
        const left = smoothedByDate[i]!
        const right = smoothedByDate[i + 1]!
        const ratio = (date - left.date) / (right.date - left.date)
        row[`${key}_lowess`] = left.value + (right.value - left.value) * ratio
      }
    }

    return withLowess.sort((a, b) => (a.date as number) - (b.date as number))
  }, [teams, metric])

  const xTickFormatter = useCallback((value: number) => format(new Date(value), 'MMM yy', { locale: ru }), [])

  const yTickFormatter = useCallback(
    (value: number) =>
      value.toLocaleString('ru-RU', {
        maximumFractionDigits: metric === 'sum' ? 1 : 0,
      }),
    [metric]
  )

  const xTicks = useMemo(() => {
    if (data.length === 0) return []
    const dates = data.map((d) => d.date as number).sort((a, b) => a - b)
    const minDate = dates[0]
    const maxDate = dates[dates.length - 1]
    const tickCount = 8
    const step = (maxDate - minDate) / (tickCount - 1)
    return Array.from({ length: tickCount }, (_, i) => minDate + i * step)
  }, [data])

  const tooltipLabelFormatter = useCallback((_: unknown, payloadMaybe?: unknown) => {
    const payloadArray = Array.isArray(payloadMaybe) ? payloadMaybe : []
    const first = payloadArray[0] as { payload?: { date?: number } } | undefined
    const date = first?.payload?.date
    if (!date) return ''
    return `${labels.trendTitle} · ${format(new Date(date), 'dd MMMM yyyy', { locale: ru })}`
  }, [labels])

  const tooltipValueFormatter = useCallback(
    (value: unknown) =>
      typeof value === 'number'
        ? value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : String(value),
    []
  )

  const tooltipKeyFormatter = useCallback((value: unknown) => {
    if (typeof value !== 'string') return String(value)
    return value.replace(/_lowess$/, '')
  }, [])

  const tooltipItemIndicator = useCallback((item: unknown) => {
    const key = String((item as { dataKey?: string | number })?.dataKey ?? '')
    return key.includes('_lowess') ? 'dot' : null
  }, [])

  const tooltipSortKeys = useMemo(
    () => teams.map(({ team }) => `${team.slug}_lowess`),
    [teams]
  )

  const tooltipContent = useCallback(
    (props: unknown) => {
      const p = props as { payload?: unknown }
      const payload = Array.isArray(p.payload) ? p.payload : []
      const filtered = payload.filter((item) => {
        const key = String((item as { dataKey?: string | number })?.dataKey ?? '')
        const value = (item as { value?: unknown })?.value
        return key.endsWith('_lowess') && value !== undefined && value !== null
      })

      return (
        <ChartTooltipContent
          {...(props as Record<string, unknown>)}
          payload={filtered}
          labelKey="date"
          labelFormatter={tooltipLabelFormatter}
          valueFormatter={tooltipValueFormatter}
          keyFormatter={tooltipKeyFormatter}
          itemIndicator={tooltipItemIndicator}
          sortByKeys={tooltipSortKeys}
        />
      )
    },
    [tooltipLabelFormatter, tooltipValueFormatter, tooltipKeyFormatter, tooltipItemIndicator, tooltipSortKeys]
  )

  const trendBounds = useMemo(() => {
    const values: number[] = []
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (key.endsWith('_lowess')) {
          const v = row[key] as number | undefined
          if (typeof v === 'number' && Number.isFinite(v)) values.push(v)
        }
      }
    }
    if (values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = Math.max((max - min) * 0.1, metric === 'sum' ? 1 : 0.5)
    return { min: Math.max(0, min - padding), max: max + padding }
  }, [data, metric])

  const yTicks = useMemo(() => {
    const min = trendBounds ? trendBounds.min : 0
    const max = trendBounds ? trendBounds.max : maxValue ?? 0
    const range = max - min
    if (!Number.isFinite(range) || range <= 0) return undefined

    const targetTicks = 5
    const rawStep = range / (targetTicks - 1)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const normalized = rawStep / magnitude
    const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
    const step = niceNormalized * magnitude

    const start = Math.ceil(min / step) * step
    const end = Math.floor(max / step) * step
    const ticks: number[] = []
    for (let v = start; v <= end + step / 2; v += step) {
      ticks.push(Number(v.toFixed(6)))
    }
    return ticks.length ? ticks : undefined
  }, [trendBounds, maxValue])

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
      <CardContent className="px-0 mx-0 py-0 pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full" debounce={150}>
          <LineChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              type="number"
              dataKey="date"
              domain={['dataMin', 'dataMax']}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              ticks={xTicks}
              tickFormatter={xTickFormatter}
            />
            <YAxis
              type="number"
              scale="linear"
              tickLine={false}
              axisLine={false}
              tickMargin={0}
              width={30}
              tickFormatter={yTickFormatter}
              allowDataOverflow
              ticks={yTicks}
              domain={
                trendBounds
                  ? [trendBounds.min, trendBounds.max]
                  : maxValue
                    ? [0, maxValue]
                    : ['dataMin', 'dataMax']
              }
            />
            {teams.map(({ team }) => (
              <Line
                key={team._id}
                dataKey={team.slug}
                type="linear"
                stroke="transparent"
                dot={{
                  r: 1.5,
                  stroke: `var(--color-${team.slug})`,
                  fill: `var(--color-${team.slug})`,
                  strokeWidth: 1,
                  strokeOpacity: 1,
                  opacity: 0.3,
                }}
                activeDot={{
                  r: 2.5,
                  stroke: `var(--color-${team.slug})`,
                  fill: `var(--color-${team.slug})`,
                  strokeWidth: 1,
                  opacity: 0.5,
                }}
                connectNulls
                strokeWidth={2}
                isAnimationActive
              />
            ))}
            {teams.map(({ team }) => (
              <Line
                key={`${team._id}-lowess`}
                dataKey={`${team.slug}_lowess`}
                type="monotone"
                stroke={`var(--color-${team.slug})`}
                dot={false}
                activeDot={false}
                strokeWidth={3}
                connectNulls
                isAnimationActive
              />
            ))}
            <ChartTooltip
              cursor={true}
              content={tooltipContent}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
