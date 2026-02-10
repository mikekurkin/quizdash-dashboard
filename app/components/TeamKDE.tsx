import { InfoIcon, LineChart } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { Area, CartesianGrid, ComposedChart, XAxis } from 'recharts'
import { cn, estimateDensities } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import Card from './ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/mobile-tooltip'

export interface TeamKDELabels {
  title: string
  description: string
  tooltip: {
    sum: string
    place: string
  }
}

// Generate mock data for placeholder with realistic KDE shapes
const generateMockData = () => {
  const data = []
  for (let i = 1; i <= 60; i++) {
    const x = (i - 1) / 59

    const sumDensity = Math.exp(-Math.pow((x - 0.8) / 0.2, 2)) * 0.4
    const placeDensity = Math.exp(-Math.pow((x - 0.1) / 0.15, 2)) * 0.3

    data.push({
      value: i,
      sum_density: Math.max(0.01, sumDensity),
      place_density: Math.max(0.01, placeDensity),
    })
  }
  return data
}

export const TeamKDE = memo(function TeamKDE({
  className,
  results,
  maxSum,
  labels,
}: {
  className?: string
  results: MinimalGameResult[]
  maxSum?: number
  labels: TeamKDELabels
}) {
  const chartConfig = useMemo(
    () =>
      ({
        sum_density: {
          label: labels.tooltip.sum,
          color: 'hsl(var(--chart-1))',
        },
        place_density: {
          label: labels.tooltip.place,
          color: 'hsl(var(--chart-3))',
        },
      }) satisfies ChartConfig,
    [labels]
  )

  const data = results.map(({ sum, place }) => ({ sum, place }))
  const densities = estimateDensities(data, ['sum', 'place'], { min: 1, max: maxSum ?? 0 })

  // Use mock data when no series is selected, real data otherwise
  const chartData = maxSum === undefined ? generateMockData() : densities
  const isPlaceholder = maxSum === undefined

  const tooltipValueFormatter = useCallback(
    (value: unknown) =>
      typeof value === 'number'
        ? `${(value * 100).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f%`
        : String(value),
    []
  )

  const tooltipKeyFormatter = useCallback((value: unknown, _item: unknown, label: unknown) => {
    if (typeof label !== 'number') return typeof value === 'string' ? value : ''
    return `${value} = ${label}`
  }, [])

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
        </TooltipProvider>{' '}
      </CardHeader>
      <div className="relative">
        <CardContent className="px-2 py-0 pt-4">
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="fillSum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-sum_density)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-sum_density)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillPlace" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-place_density)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-place_density)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="value"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                domain={[1, maxSum ?? 'dataMax']}
                interval="preserveStartEnd"
              />
              <ChartTooltip
                cursor={true}
                content={
                  <ChartTooltipContent
                    labelKey="value"
                    indicator="dot"
                    valueFormatter={tooltipValueFormatter}
                    keyFormatter={tooltipKeyFormatter}
                  />
                }
              />
              <Area
                dataKey="place_density"
                type="natural"
                fill="url(#fillPlace)"
                stroke="var(--color-place_density)"
                stackId="a"
                dot={false}
                strokeWidth={3}
                yAxisId={1}
                isAnimationActive={!isPlaceholder}
              />
              <Area
                dataKey="sum_density"
                type="natural"
                fill="url(#fillSum)"
                stroke="var(--color-sum_density)"
                stackId="b"
                dot={false}
                strokeWidth={3}
                yAxisId={2}
                isAnimationActive={!isPlaceholder}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>

        {isPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="text-center">
              <LineChart className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
              <div className="text-sm text-muted-foreground/60">Выберите серию чтобы увидеть статистику</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
})
