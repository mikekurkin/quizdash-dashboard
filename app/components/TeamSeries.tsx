'use client'

import { ChevronDown, X } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import { Cell, Label, Pie, PieChart, Sector } from 'recharts'
import { PieSectorDataItem } from 'recharts/types/polar/Pie'
import { cn } from '~/lib/utils'
import { Series } from '~/schemas/series'
import { Button } from './ui/button'
import Card from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { CardContent, CardHeader, CardTitle } from './ui/chart-card'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

export interface TeamSeriesLabels {
  title: string
  more: string
  rest: string
  all: string
  games_all: string
  games_one: string
  games_few: string
  games_many: string
}

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-1) / 0.8)',
  'hsl(var(--chart-1) / 0.6)',
  'hsl(var(--chart-1) / 0.4)',
  'hsl(var(--chart-1) / 0.2)',
  'hsl(var(--chart-1) / 0.1)',
]

const generateSeriesColors = (index: number, isOthers: boolean = false) =>
  isOthers ? 'hsl(var(--muted))' : chartColors[index % chartColors.length]

export const TeamSeries = memo(function TeamSeries({
  className,
  series,
  currentSeriesId,
  changeSeries,
  labels,
}: {
  className?: string
  series: { count: number; series: Series | null }[]
  currentSeriesId: string | null
  changeSeries: (newSeries: Series | null) => void
  labels: TeamSeriesLabels
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const clearSeries = useCallback(() => changeSeries(null), [changeSeries])

  const { topSeries, otherSeries, selectedRare, data } = useMemo(() => {
    const sorted = [...series].sort((a, b) => b.count - a.count)
    const maxSeriesCount = chartColors.length
    const threshold = sorted[maxSeriesCount - 1]?.count ?? 0
    const top = series.filter((s) => s.count > threshold)
    const others = series.filter((s) => s.count <= threshold)
    const allSeriesCount = series.reduce((acc, s) => acc + s.count, 0)
    const topSeriesCount = top.reduce((acc, s) => acc + s.count, 0)
    const othersCount = allSeriesCount - topSeriesCount

    const data = [
      ...top.map((s) => ({ count: s.count, ...s.series })),
      { count: othersCount, name: labels.rest, _id: undefined },
    ]

    const selectedRare = others.find((r) => r.series?._id === currentSeriesId)

    return { topSeries: top, otherSeries: others, selectedRare, data }
  }, [series, currentSeriesId, labels])

  const activeIndex = useMemo(
    () =>
      [hoveredIndex, data.findIndex((s) => s._id === currentSeriesId)].filter(
        (i): i is number => i !== null && i !== -1
      ),
    [hoveredIndex, currentSeriesId, data]
  )

  const renderActiveShape = useCallback(
    ({ outerRadius = 0, payload, ...props }: PieSectorDataItem) => {
      const isOthers = payload._id === undefined
      const isActive = currentSeriesId !== undefined && currentSeriesId === payload._id
      const offset = isOthers ? 0 : isActive ? 10 : 5
      return <Sector {...props} outerRadius={outerRadius + offset} />
    },
    [currentSeriesId]
  )

  const handleSectorClick = useCallback(
    (data?: Series) => {
      if (!changeSeries) return
      if (data?._id === currentSeriesId) clearSeries()
      else if (data) changeSeries(data)
    },
    [changeSeries, clearSeries, currentSeriesId]
  )

  const handleHoverChange = useCallback((_: unknown, index?: number) => {
    setHoveredIndex(index ?? null)
  }, [])

  const handleHoverLeave = useCallback(() => handleHoverChange(undefined, undefined), [handleHoverChange])
  return (
    <Card className={cn('pt-0', className)}>
      <CardHeader className="flex flex-row gap-2 space-y-0 py-0 pt-5 justify-between">
        <CardTitle>{labels.title}</CardTitle>
        {currentSeriesId && (
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={clearSeries}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 justify-center px-0 mx-0 py-0 pt-4">
        <div className="flex flex-row sm:flex-col lg:flex-row items-center gap-4 sm:gap-0 lg:gap-2">
          <ChartContainer className="mx-auto aspect-square w-full max-w-[250px] h-[180px] sm:h-[250px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onClick={handleSectorClick}
                onMouseEnter={handleHoverChange}
                onMouseLeave={handleHoverLeave}
                style={{ cursor: 'pointer' }}
                animationDuration={350}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={generateSeriesColors(index, entry._id === undefined)} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      const current = series.find((s) => s.series?._id === currentSeriesId)
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                            {currentSeriesId ? (current?.count ?? 0) : labels.all}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                            {current === undefined
                              ? labels.games_all
                              : [11, 12, 13].includes(current.count % 100) ||
                                  current.count % 10 >= 5 ||
                                  current.count % 10 === 0
                                ? labels.games_many
                                : current.count % 10 === 1
                                  ? labels.games_one
                                  : labels.games_few}
                          </tspan>
                        </text>
                      )
                    }
                    return null
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="flex flex-col items-start gap-y-1 min-w-48 max-w-48 sm:max-w-64 lg:max-w-48">
            {topSeries.map((item, index) => (
              <button
                key={item.series?._id}
                onClick={() => item.series && changeSeries?.(item.series)}
                className={cn(
                  'flex items-center gap-2 text-sm transition-colors text-left w-full',
                  currentSeriesId === item.series?._id && 'font-semibold'
                )}
              >
                <span className="w-3 h-3 rounded-[.2rem]" style={{ backgroundColor: generateSeriesColors(index) }} />
                <span className="truncate" title={item.series?.name}>
                  {item.series?.name}
                </span>
              </button>
            ))}
            {otherSeries.length > 0 && (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-2 text-sm transition-colors text-left w-full',
                      selectedRare && 'font-semibold'
                    )}
                  >
                    <span className="w-3 h-3 rounded-[.2rem] text-foreground-muted bg-muted flex items-center justify-center">
                      <ChevronDown className="size-3" />
                    </span>
                    <span className="truncate" title={selectedRare ? selectedRare.series?.name : labels.more}>
                      {selectedRare ? selectedRare.series?.name : labels.more}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-2 w-64 max-h-72 overflow-y-auto" align="start">
                  <div className="flex flex-col gap-1">
                    {otherSeries.map((item) => (
                      <button
                        key={item.series?._id}
                        onClick={() => {
                          item.series && changeSeries?.(item.series)
                          setPopoverOpen(false)
                        }}
                        className={cn(
                          'flex items-center gap-1 text-sm px-1 py-1 rounded hover:bg-accent transition-colors text-left',
                          currentSeriesId === item.series?._id && 'bg-accent'
                        )}
                      >
                        <span className="truncate" title={item.series?.name}>
                          {item.series?.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
