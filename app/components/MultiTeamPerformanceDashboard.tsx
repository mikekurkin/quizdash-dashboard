import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Series } from '~/schemas/series'
import { Team } from '~/schemas/team'
import { MultiTeamInfo, MultiTeamInfoLabels } from './MultiTeamInfo'
import { MultiTeamKDE, MultiTeamKDELabels } from './MultiTeamKDE'
import { MultiTeamRounds, MultiTeamRoundsLabels } from './MultiTeamRounds'
import { MultiTeamTimeline, MultiTeamTimelineLabels } from './MultiTeamTimeline'

type TeamResults = {
  team: Team
  results: MinimalGameResult[]
}

export function MultiTeamPerformanceDashboard({
  className,
  teams,
  series,
  selectedSeriesId,
  labels,
  teamColors,
}: {
  className?: string
  teams: TeamResults[]
  series: Series[]
  selectedSeriesId: string | null
  labels: {
    info: MultiTeamInfoLabels
    timelineSum: MultiTeamTimelineLabels
    timelinePlace: MultiTeamTimelineLabels
    kdeSum: MultiTeamKDELabels
    kdePlace: MultiTeamKDELabels
    rounds: MultiTeamRoundsLabels
  }
  teamColors: Record<string, string>
}) {
  const selectedSeries = useMemo(
    () => (selectedSeriesId ? series.find((s) => s._id === selectedSeriesId) ?? null : null),
    [selectedSeriesId, series]
  )

  const filteredTeams = useMemo(
    () =>
      teams.map(({ team, results }) => ({
        team,
        results: selectedSeriesId ? results.filter((r) => r.game_series_id === selectedSeriesId) : results,
      })),
    [teams, selectedSeriesId]
  )

  const maxSum = selectedSeries?.maxSum ?? Math.max(0, ...filteredTeams.flatMap((t) => t.results.map((r) => r.sum)))
  const maxPlace = Math.max(0, ...filteredTeams.flatMap((t) => t.results.map((r) => r.place)))

  return (
    <div className={cn('flex flex-col gap-2 py-4', className)}>
      <MultiTeamInfo teams={teams} selectedSeriesId={selectedSeriesId} labels={labels.info} series={series} />
      <MultiTeamTimeline
        teams={filteredTeams}
        labels={labels.timelineSum}
        metric="sum"
        maxValue={selectedSeries?.maxSum}
        teamColors={teamColors}
      />
      <MultiTeamTimeline
        teams={filteredTeams}
        labels={labels.timelinePlace}
        metric="place"
        maxValue={maxPlace || undefined}
        teamColors={teamColors}
      />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <MultiTeamKDE
          teams={filteredTeams}
          labels={labels.kdeSum}
          metric="sum"
          maxValue={maxSum || 1}
          teamColors={teamColors}
        />
        <MultiTeamKDE
          teams={filteredTeams}
          labels={labels.kdePlace}
          metric="place"
          maxValue={maxPlace || 1}
          teamColors={teamColors}
        />
      </div>
      <MultiTeamRounds
        teams={filteredTeams}
        seriesRounds={selectedSeries?.maxRoundSums}
        labels={labels.rounds}
        teamColors={teamColors}
      />
    </div>
  )
}
