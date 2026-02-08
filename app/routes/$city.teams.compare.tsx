import { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useNavigate, useOutletContext, useSearchParams } from '@remix-run/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MultiTeamPerformanceDashboard } from '~/components/MultiTeamPerformanceDashboard'
import { AsyncMultiSelect } from '~/components/ui/async-multi-select'
import { MultiSelectOption } from '~/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import i18next from '~/i18n/i18next.server'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Series } from '~/schemas/series'
import { Team } from '~/schemas/team'
import { storage } from '~/services/storage.server'
import { CityContext } from './$city'

export const handle = { i18n: 'teams' }

export async function loader({ request, params }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', ['teams', 'common'])
  const url = new URL(request.url)
  const raw = url.searchParams.get('teams')
  const seriesSlug = url.searchParams.get('s')
  const selectedTeamSlugs = raw
    ? raw
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean)
    : []

  const citySlug = params.city
  const city = citySlug ? await storage.getCityBySlug(citySlug) : null
  const selectedTeamOptions: MultiSelectOption[] = []
  const selectedTeams: { team: Team; results: MinimalGameResult[] }[] = []

  if (city && selectedTeamSlugs.length > 0) {
    const teams = await Promise.all(selectedTeamSlugs.map((slug) => storage.getTeamBySlug(slug, city._id)))
    const results = await Promise.all(
      teams.map((team) => (team ? storage.getMinimalGameResultsByTeam(team._id) : Promise.resolve([])))
    )

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i]
      if (!team) continue
      selectedTeamOptions.push({ label: team.name, value: team.slug })
      selectedTeams.push({
        team,
        results: results[i]!.sort((a, b) => a.game_date.getTime() - b.game_date.getTime()),
      })
    }
  }

  const seriesIds = Array.from(
    new Set(selectedTeams.flatMap((team) => team.results.map((result) => result.game_series_id)))
  )

  const series: Series[] = seriesIds.length ? await storage.getSeriesById(seriesIds) : []
  const seriesCounts = new Map<string, number>()
  for (const team of selectedTeams) {
    for (const result of team.results) {
      seriesCounts.set(result.game_series_id, (seriesCounts.get(result.game_series_id) ?? 0) + 1)
    }
  }

  series.sort((a, b) => {
    const countDiff = (seriesCounts.get(b._id) ?? 0) - (seriesCounts.get(a._id) ?? 0)
    if (countDiff !== 0) return countDiff
    return a.name.localeCompare(b.name)
  })

  const selectedSeries =
    (seriesSlug ? series.find((s) => s.slug === seriesSlug) : null) ?? series.at(0) ?? null

  return {
    selectedTeamSlugs,
    selectedTeamOptions,
    selectedTeams,
    series,
    selectedSeriesSlug: selectedSeries?.slug ?? null,
    selectedSeriesId: selectedSeries?._id ?? null,
    t: {
      title: t('compare.title'),
      description: t('compare.description'),
      selectPlaceholder: t('compare.selectPlaceholder'),
      searchPlaceholder: t('compare.searchPlaceholder'),
      seriesLabel: t('compare.seriesLabel'),
      errors: {
        loadTeams: t('compare.errors.loadTeams'),
      },
      info: t('compare.info', { returnObjects: true }),
      timelineSum: t('compare.timelineSum', { returnObjects: true }),
      timelinePlace: t('compare.timelinePlace', { returnObjects: true }),
      kdeSum: t('compare.kdeSum', { returnObjects: true }),
      kdePlace: t('compare.kdePlace', { returnObjects: true }),
      rounds: t('compare.rounds', { returnObjects: true }),
    },
  }
}

const palette = [
  {
    badge: 'bg-blue-100 text-blue-800 hover:bg-blue-300',
    chart: 'var(--team-1)',
  },
  {
    badge: 'bg-green-100 text-green-800 hover:bg-green-300',
    chart: 'var(--team-2)',
  },
  {
    badge: 'bg-purple-100 text-purple-800 hover:bg-purple-300',
    chart: 'var(--team-3)',
  },
  {
    badge: 'bg-orange-100 text-orange-800 hover:bg-orange-300',
    chart: 'var(--team-4)',
  },
  {
    badge: 'bg-pink-100 text-pink-800 hover:bg-pink-300',
    chart: 'var(--team-5)',
  },
]

export default function TeamsCompareRoute() {
  const { currentCity } = useOutletContext<CityContext>()
  const [searchParams, _setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { selectedTeamSlugs, selectedTeamOptions, selectedTeams, series, selectedSeriesSlug, selectedSeriesId, t } =
    useLoaderData<typeof loader>()

  const teamColors = useMemo(() => {
    const colorMap: Record<string, string> = {}
    selectedTeams.forEach((teamEntry, index) => {
      colorMap[teamEntry.team.slug] = palette[index % palette.length]!.chart
    })
    return colorMap
  }, [selectedTeams])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(entry.boundingClientRect.top < 0 && entry.intersectionRatio === 0)
      },
      { root: null, threshold: [0, 1] }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const fetchTeams = useCallback(
    async (search: string): Promise<MultiSelectOption[]> => {
      const params = new URLSearchParams()
      params.set('city', currentCity.slug)
      params.set('limit', '20')
      params.set('sort', 'name')
      if (search) params.set('q', search)

      const response = await fetch(`/api/teams?${params.toString()}`)
      if (!response.ok) {
        throw new Error(t.errors.loadTeams)
      }

      const data = (await response.json()) as { data: { slug: string; name: string }[] }
      return data.data.map((team) => ({ label: team.name, value: team.slug }))
    },
    [currentCity.slug, t.errors.loadTeams]
  )

  const handleTeamsChange = useCallback(
    (nextValue: string[]) => {
      const nextParams = new URLSearchParams(searchParams)
      if (nextValue.length > 0) {
        nextParams.set('teams', nextValue.join(','))
      } else {
        nextParams.delete('teams')
      }
      navigate(`?${nextParams.toString()}`, { replace: true, preventScrollReset: true })
    },
    [searchParams, navigate]
  )

  const handleSeriesChange = useCallback(
    (nextValue: string) => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('s', nextValue)
      navigate(`?${nextParams.toString()}`, { replace: true, preventScrollReset: true })
    },
    [searchParams, navigate]
  )

  return (
    <div className="mx-4 my-6 md:mx-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={selectedSeriesSlug ?? undefined}
            onValueChange={handleSeriesChange}
            disabled={selectedTeamSlugs.length === 0}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t.seriesLabel} />
            </SelectTrigger>
            <SelectContent align="end">
              {series.map((seriesItem) => (
                <SelectItem key={seriesItem._id} value={seriesItem.slug}>
                  {seriesItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div ref={sentinelRef} className="h-0" />
      <div className="sticky top-14 z-20 bg-transparent py-3">
        <AsyncMultiSelect
          queryKey={`teams-${currentCity.slug}`}
          queryFn={fetchTeams}
          initialOptions={selectedTeamOptions}
          value={selectedTeamSlugs}
          onChange={handleTeamsChange}
          maxSelected={5}
          placeholder={t.selectPlaceholder}
          searchPlaceholder={t.searchPlaceholder}
          badgeClassNames={palette.map((p) => p.badge)}
          triggerClassName={isStuck ? 'shadow-lg' : undefined}
        />
      </div>
      {selectedTeamSlugs.length > 0 && (
        <MultiTeamPerformanceDashboard
          teams={selectedTeams}
          series={series}
          selectedSeriesId={selectedSeriesId}
          teamColors={teamColors}
          labels={{
            info: t.info,
            timelineSum: t.timelineSum,
            timelinePlace: t.timelinePlace,
            kdeSum: t.kdeSum,
            kdePlace: t.kdePlace,
            rounds: t.rounds,
          }}
        />
      )}
    </div>
  )
}
