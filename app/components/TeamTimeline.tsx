import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { InfoIcon } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { addLowess, cn } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Series } from '~/schemas/series'
import Card from './ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'

export interface TeamTimelineLabels {
  title: string
  description: string
  tooltip: {
    sum: string
    sum_lowess: string
    place: string
    place_lowess: string
    date: string
  }
}

type TeamTimelineProps = {
  className?: string
  results: MinimalGameResult[]
  maxSum?: number
  labels: TeamTimelineLabels
  series: Series[]
}

type TooltipPayload = {
  payload: {
    date: number
    sum: number
    place: number
    sum_lowess: number
    place_lowess: number
    pack_formatted: string
    game_series_id: string
  }
  dataKey: string | number
  name: string | number
  value: number
}

export const TeamTimeline = memo(function TeamTimeline({
  className,
  results,
  maxSum,
  labels,
  series,
}: TeamTimelineProps) {
  const chartConfig = useMemo(
    () =>
      ({
        date: {
          label: labels.tooltip.date,
        },
        sum: {
          label: labels.tooltip.sum,
          color: 'hsl(var(--chart-1))',
        },
        sum_lowess: {
          label: labels.tooltip.sum_lowess,
          color: 'hsl(var(--chart-1))',
        },
        place: {
          label: labels.tooltip.place,
          color: 'hsl(var(--chart-3))',
        },
        place_lowess: {
          label: labels.tooltip.place_lowess,
          color: 'hsl(var(--chart-3))',
        },
      }) satisfies ChartConfig,
    [labels]
  )

  const dataWithLowess = useMemo(() => {
    const sorted = [...results].sort((a, b) => a.game_date.getTime() - b.game_date.getTime())
    const data = sorted.map(({ game_date, sum, place, pack_formatted, game_series_id }) => ({
      date: game_date.getTime(),
      sum,
      place,
      pack_formatted,
      game_series_id,
    }))
    return addLowess(data, ['sum', 'place'], { sorted: true })
  }, [results])

  const xTickFormatter = useCallback((value: number) => {
    const date = new Date(value)
    return format(date, 'MMM yy', { locale: ru })
  }, [])

  const yTickFormatter = useCallback((value: number) => {
    return value.toLocaleString('ru-RU', {
      maximumFractionDigits: 1,
    })
  }, [])

  const xTicks = useMemo(() => {
    if (dataWithLowess.length === 0) return []
    const dates = dataWithLowess.map((d) => d.date).sort((a, b) => a - b)
    const minDate = dates[0]
    const maxDate = dates[dates.length - 1]
    const tickCount = 8
    const step = (maxDate - minDate) / (tickCount - 1)
    return Array.from({ length: tickCount }, (_, i) => minDate + i * step)
  }, [dataWithLowess])

  const tooltipItemIndicator = useCallback(
    (p: unknown) =>
      String(
        (p as { dataKey?: string | number; name?: string | number })?.dataKey ??
          (p as { name?: string | number })?.name ??
          ''
      ).includes('lowess')
        ? null
        : 'dot',
    []
  )

  const tooltipLabelFormatter = useCallback(
    (_: unknown, payloadMaybe?: unknown) => {
      const payloadArray = Array.isArray(payloadMaybe) ? payloadMaybe : []
      const first = payloadArray[0] as TooltipPayload | undefined
      const res = first?.payload
      if (res === undefined) return ''
      const resSeries = series.find((s) => s._id === res.game_series_id) as Series | undefined
      return (
        <>
          {`${resSeries?.name} ${res.pack_formatted}`}
          <br />
          {format(res.date, 'dd MMMM yyyy', { locale: ru })}
        </>
      )
    },
    [series]
  )

  const tooltipValueFormatter = useCallback(
    (value: unknown) =>
      typeof value === 'number' ? value.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) : String(value),
    []
  )

  const scatterLineConfig = useCallback(
    (key: keyof Omit<ChartConfig, 'date'>) =>
      ({
        dataKey: key,
        type: 'linear',
        stroke: 'transparent',
        dot: {
          r: 2,
          stroke: `var(--color-${key})`,
          fill: `var(--color-${key})`,
          strokeWidth: 1,
          strokeOpacity: 1,
          opacity: 0.6,
        },
        activeDot: {
          r: 3,
          stroke: `var(--color-${key})`,
          fill: `var(--color-${key})`,
          strokeWidth: 1,
          opacity: 0.8,
        },
        animationDuration: 240,
        animationBegin: 0,
        animationEasing: 'ease-out',
      }) as const,
    []
  )

  const lowessLineConfig = useCallback(
    (key: keyof Omit<ChartConfig, 'date'>) =>
      ({
        dataKey: `${key}_lowess`,
        type: 'monotone',
        stroke: `var(--color-${key})`,
        dot: false,
        activeDot: false,
        strokeWidth: 3,
        yAxisId: 1,
        animationDuration: 350,
        animationEasing: 'ease-out',
      }) as const,
    []
  )

  const xAxisConfig = useMemo(
    () => ({
      type: 'number' as const,
      domain: ['dataMin', 'dataMax'] as [string, string],
      tickLine: false,
      axisLine: false,
      tickMargin: 8,
      ticks: xTicks,
      tickFormatter: xTickFormatter,
    }),
    [xTicks, xTickFormatter]
  )

  const yAxisConfig = useMemo(
    () => ({
      type: 'number' as const,
      tickLine: false,
      axisLine: false,
      tickMargin: 0,
      tickCount: 3,
      width: 30,
      tickFormatter: yTickFormatter,
    }),
    [yTickFormatter]
  )

  const sortByKeys = useMemo(() => Object.keys(chartConfig), [chartConfig])

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
          <ComposedChart data={dataWithLowess}>
            <CartesianGrid vertical={false} />

            <XAxis {...xAxisConfig} dataKey="date" />
            <YAxis
              {...yAxisConfig}
              tick={{ stroke: 'var(--color-sum)', strokeOpacity: 0.5 }}
              domain={['dataMin', maxSum ?? 'dataMax']}
              yAxisId={1}
              dataKey="sum"
            />
            <YAxis
              {...yAxisConfig}
              tick={{ stroke: 'var(--color-place)', strokeOpacity: 0.5 }}
              domain={['dataMin', 'dataMax']}
              orientation="right"
              yAxisId={2}
              dataKey="place"
            />

            <Line {...scatterLineConfig('sum')} yAxisId={1} />
            <Line {...lowessLineConfig('sum')} yAxisId={1} />
            <Line {...scatterLineConfig('place')} yAxisId={2} />
            <Line {...lowessLineConfig('place')} yAxisId={2} />

            <ChartTooltip
              cursor={true}
              content={
                <ChartTooltipContent
                  labelKey="date"
                  sortByKeys={sortByKeys}
                  labelFormatter={tooltipLabelFormatter}
                  itemIndicator={tooltipItemIndicator}
                  valueFormatter={tooltipValueFormatter}
                />
              }
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})
