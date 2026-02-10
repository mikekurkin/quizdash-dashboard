import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'

import { BarChart3, InfoIcon } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { cn } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import Card from './ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/mobile-tooltip'

export interface TeamRoundsLabels {
  title: string
  description: string
  tooltip: {
    max: string
    average: string
  }
}

const generateMockData = () => {
  const rounds = []
  const numRounds = 7
  const maxScores = [8, 8, 6, 9, 6, 8, 24]

  for (let roundIndex = 0; roundIndex < numRounds; roundIndex++) {
    const maxScore = maxScores[roundIndex]

    const performanceRatio = 0.65 + Math.random() * 0.15 + Math.sin(roundIndex * 0.5) * 0.1
    const average = Math.round(maxScore * performanceRatio * 100) / 100

    rounds.push({
      round: roundIndex + 1,
      average: average,
      maximum: maxScore,
    })
  }

  return rounds
}

export const TeamRounds = memo(function TeamRounds({
  className,
  seriesRounds,
  results,
  labels,
}: {
  className?: string
  seriesRounds?: number[]
  results: MinimalGameResult[]
  labels: TeamRoundsLabels
}) {
  const chartConfig = useMemo(
    () =>
      ({
        maximum: {
          label: labels.tooltip.max,
          color: 'hsl(var(--chart-1) / 0.4)',
        },
        average: {
          label: labels.tooltip.average,
          color: 'hsl(var(--chart-1))',
        },
      }) satisfies ChartConfig,
    [labels]
  )

  const teamRoundAverages = (() => {
    if (results.length === 0) return []

    const maxRounds = Math.max(...results.map((r) => r.rounds.length))

    const averages = []
    for (let roundIndex = 0; roundIndex < maxRounds; roundIndex++) {
      const roundScores = results
        .map((r) => r.rounds[roundIndex])
        .filter((score) => score !== undefined && score !== null)

      if (roundScores.length > 0) {
        const average = roundScores.reduce((sum, score) => sum + score, 0) / roundScores.length
        averages.push(Math.round(average * 100) / 100) // Round to 2 decimal places
      } else {
        averages.push(0)
      }
    }

    return averages
  })()

  const isPlaceholder = seriesRounds === undefined
  const chartData = isPlaceholder
    ? generateMockData()
    : (seriesRounds?.map((roundSum, index) => ({
        round: index + 1,
        average: teamRoundAverages.at(index),
        maximum: roundSum,
        label: `${teamRoundAverages.at(index)?.toLocaleString('ru-RU')}\u202f/\u202f${roundSum.toLocaleString('ru-RU')}`,
      })) ?? [])

  const tooltipLabelFormatter = useCallback((_: unknown, payload: unknown) => {
    if (typeof payload === 'object' && Array.isArray(payload) && payload.at(0))
      return `${payload.at(0).payload.round} раунд`
    return ''
  }, [])

  const tooltipValueFormatter = useCallback(
    (value: unknown) =>
      typeof value === 'number' ? value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : String(value),
    []
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
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="round" tickLine={false} tickMargin={10} axisLine={false} xAxisId="a" />
                <XAxis dataKey="round" tickLine={false} tickMargin={10} axisLine={false} hide xAxisId="b" />
                <YAxis dataKey="maximum" domain={[0, 'dataMax+2']} hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={tooltipLabelFormatter}
                      valueFormatter={tooltipValueFormatter}
                    />
                  }
                />
                <Bar
                  dataKey="maximum"
                  xAxisId="a"
                  fill="var(--color-maximum)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!isPlaceholder}
                >
                  <LabelList dataKey="label" position="top" offset={12} className="fill-foreground" fontSize={12} />
                </Bar>
                <Bar
                  dataKey="average"
                  xAxisId="b"
                  fill="var(--color-average)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!isPlaceholder}
                ></Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </div>
        {isPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
              <div className="text-sm text-muted-foreground/60">Выберите серию чтобы увидеть статистику</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
})
