import { useSubmit } from '@remix-run/react'
import { format } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DateRange } from 'react-day-picker'
import { cn, filterAndSortSeries } from '~/lib/utils'
import { GameResultsResponse, MinimalGameResult } from '~/schemas/gameResult'
import { Series } from '~/schemas/series'
import { Team } from '~/schemas/team'
import { TeamInfo, TeamInfoLabels } from './TeamInfo'
import { TeamKDE, TeamKDELabels } from './TeamKDE'
import { TeamResultsTable, TeamResultsTableLabels } from './TeamResultsTable'
import { TeamRounds, TeamRoundsLabels } from './TeamRounds'
import { TeamSeries, TeamSeriesLabels } from './TeamSeries'
import { TeamTimeline, TeamTimelineLabels } from './TeamTimeline'

export function TeamPerformanceDashboard({
  className,
  team,
  results,
  series,
  selectedSeriesId,
  resultsForTable,
  labels,
  selectedDate = null,
}: {
  className?: string
  team: Team
  results: MinimalGameResult[]
  series: Series[]
  selectedSeriesId: string | null
  resultsForTable: GameResultsResponse
  labels: {
    info: TeamInfoLabels
    series: TeamSeriesLabels
    timeline: TeamTimelineLabels
    kde: TeamKDELabels
    rounds: TeamRoundsLabels
    table: TeamResultsTableLabels
  }
  selectedDate: DateRange | null
}) {
  const [date, setDate] = useState<DateRange | null>(selectedDate)
  const [seriesId, setSeriesId] = useState<string | null>(selectedSeriesId)
  const submit = useSubmit()

  const currentSeries = useMemo(
    () => (seriesId ? (series.find((s) => s._id === seriesId) ?? null) : null),
    [seriesId, series]
  )

  useEffect(() => setDate(selectedDate), [selectedDate])
  useEffect(() => setSeriesId(selectedSeriesId), [selectedSeriesId])

  const submitQuery = useCallback(
    ({ slug = currentSeries?.slug, newDate = date }: { slug?: string; newDate?: DateRange | null }) => {
      const formData = new FormData()
      if (slug) formData.append('s', slug)
      if (newDate?.from) formData.append('from', format(newDate.from, 'yyyy-MM-dd'))
      if (newDate?.to) formData.append('to', format(newDate.to, 'yyyy-MM-dd'))

      submit(formData, {
        method: 'get',
        replace: true,
        preventScrollReset: true,
      })
    },
    [currentSeries?.slug, date, submit]
  )

  const { filteredResults, sortedSeries } = useMemo(() => {
    const { filtered, sortedSeries } = filterAndSortSeries(results, series, date)
    return { filteredResults: filtered, sortedSeries }
  }, [results, series, date])

  const filteredResultsForSeries = useMemo(() => {
    if (!seriesId) return filteredResults
    return filteredResults.filter((r) => r.game_series_id === seriesId)
  }, [filteredResults, seriesId])

  const handleSeriesChange = useCallback(
    (newSeries: Series | null) => {
      setSeriesId(newSeries?._id ?? null)

      submitQuery({ slug: newSeries?.slug ?? 'all' })
    },
    [submitQuery]
  )

  const handleDateChange = useCallback(
    (newDate: DateRange | null) => {
      setDate(newDate)
      submitQuery({ newDate })

      if (seriesId === null) return
      if (sortedSeries.map((s) => s.series?._id).includes(seriesId)) return

      setSeriesId(sortedSeries.at(0)?.series?._id ?? null)
    },
    [seriesId, sortedSeries, submitQuery]
  )

  return (
    <>
      <div className={cn(className, 'grid grid-cols-1 sm:grid-cols-2 flex-1 gap-2 py-4')}>
        <TeamInfo
          team={team}
          results={results}
          filteredResults={seriesId ? filteredResultsForSeries : null}
          series={series}
          date={date}
          setDate={handleDateChange}
          labels={labels.info}
        />
        <TeamSeries
          series={sortedSeries}
          currentSeriesId={seriesId}
          changeSeries={handleSeriesChange}
          labels={labels.series}
        />
        <TeamTimeline
          className="sm:col-span-2"
          results={filteredResultsForSeries}
          maxSum={currentSeries?.maxSum}
          series={series}
          labels={labels.timeline}
        />
        <TeamKDE results={filteredResultsForSeries} maxSum={currentSeries?.maxSum} labels={labels.kde} />
        <TeamRounds
          results={filteredResultsForSeries}
          seriesRounds={currentSeries?.maxRoundSums}
          labels={labels.rounds}
        />
      </div>
      <TeamResultsTable team={team} initialResults={resultsForTable} labels={labels.table} seriesId={seriesId} />
    </>
  )
}
