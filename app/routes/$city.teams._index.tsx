import type { MetaFunction } from '@remix-run/node'
import { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useOutletContext, useSearchParams, useSubmit } from '@remix-run/react'
import { InfoIcon, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { TeamsTable } from '~/components/TeamsTable'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import { TEAMS_PER_PAGE } from '~/hooks/useTeams'
import i18next from '~/i18n/i18next.server'
import { storage } from '~/services/storage.server'
import { CityContext } from './$city'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }]
}

export const handle = { i18n: 'teams' }

const ALLOWED_SORTS = new Set(['games', 'sum_total', 'avg_sum', 'best_sum'])

export async function loader({ params, request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', ['teams', 'common'])
  const url = new URL(request.url)
  const search = url.searchParams.get('q') || undefined
  const seriesSlug = url.searchParams.get('s') || undefined
  const minGamesParam = url.searchParams.get('min_games')
  const rawMinGames = minGamesParam ? Number(minGamesParam) : undefined
  const sortParam = url.searchParams.get('sort') || 'games'
  const sort = ALLOWED_SORTS.has(sortParam) ? sortParam : 'games'
  const order = 'desc' as const
  const minGames =
    sort === 'avg_sum' ? (Number.isFinite(rawMinGames) ? rawMinGames : 5) : undefined

  const teams = await storage.getTeams({
    citySlug: params.city!,
    search,
    seriesSlug: seriesSlug === 'all' ? undefined : seriesSlug,
    minGames,
    sort,
    order,
    limit: TEAMS_PER_PAGE,
  })

  const series = await storage.getSeries()
  const city = await storage.getCityBySlug(params.city!)
  const cityId = city?._id
  const citySeries = series.filter(
    (seriesItem) =>
      cityId !== undefined && (seriesItem.gamesCountByCity?.[String(cityId)] ?? 0) > 0
  )
  citySeries.sort((a, b) => {
    const aCount = cityId ? (a.gamesCountByCity?.[String(cityId)] ?? 0) : 0
    const bCount = cityId ? (b.gamesCountByCity?.[String(cityId)] ?? 0) : 0
    const countDiff = bCount - aCount
    if (countDiff !== 0) return countDiff
    return a.name.localeCompare(b.name)
  })

  return {
    t: {
      title: t('list.title'),
      description: t('list.description'),
      searchPlaceholder: t('list.searchPlaceholder'),
      seriesLabel: t('list.seriesLabel'),
      seriesAll: t('list.seriesAll'),
      searchLabel: t('common:search.label'),
      columnHeaders: t('list.columnHeaders', { returnObjects: true }),
      endOfResults: t('common:endOfResults'),
      noResults: t('list.noResults'),
    },
    teams: {
      data: teams.data,
      nextCursor: teams.nextCursor,
    },
    series: citySeries,
    meta: {
      title: t('list.meta.title'),
      description: t('list.meta.description'),
    },
  }
}

export default function TeamsRoute() {
  const { t, teams, series } = useLoaderData<typeof loader>()
  const { currentCity } = useOutletContext<CityContext>()
  const [searchParams] = useSearchParams()
  const submit = useSubmit()

  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const selectedSeries = searchParams.get('s') ?? 'all'
  const selectedSeriesValue =
    selectedSeries !== 'all' && !series.some((seriesItem) => seriesItem.slug === selectedSeries)
      ? 'all'
      : selectedSeries
  const sortParam = searchParams.get('sort') ?? 'games'
  const sort = ALLOWED_SORTS.has(sortParam) ? sortParam : 'games'

  useEffect(() => {
    const queryParam = searchParams.get('q')
    if (queryParam !== null && queryParam !== search) {
      setSearch(queryParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const submitSearch = useCallback(
    (value: string) => {
      const formData = new FormData()
      if (value) formData.append('q', value)
      const s = searchParams.get('s')
      if (s) formData.append('s', s)
      const sortParam = searchParams.get('sort')
      if (sortParam && ALLOWED_SORTS.has(sortParam)) formData.append('sort', sortParam)
      if (sortParam === 'avg_sum') formData.append('min_games', '5')
      formData.append('order', 'desc')

      submit(formData, { method: 'get', replace: true })
    },
    [searchParams, submit]
  )

  const debouncedSubmit = useDebouncedCallback((value: string) => {
    submitSearch(value)
  }, 300)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    debouncedSubmit(value)
  }

  const handleSeriesChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === 'all') params.delete('s')
    else params.set('s', value)
    submit(params, { method: 'get', replace: true, preventScrollReset: true })
  }

  const handleSortChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams)
      params.set('sort', key)
      params.set('order', 'desc')
      if (key === 'avg_sum') {
        params.set('min_games', '5')
      } else {
        params.delete('min_games')
      }
      submit(params, { method: 'get', replace: true, preventScrollReset: true })
    },
    [searchParams, submit]
  )

  const seriesId = useMemo(
    () =>
      selectedSeriesValue === 'all' ? null : series.find((s) => s.slug === selectedSeriesValue)?._id ?? null,
    [series, selectedSeriesValue]
  )
  const selectedSeriesLabel =
    selectedSeriesValue === 'all'
      ? t.seriesAll
      : series.find((s) => s.slug === selectedSeriesValue)?.name ?? t.seriesAll

  return (
    <div>
      <div className="mx-4 my-6 md:mx-0">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 items-baseline">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="bg-card rounded-sm p-2 text-muted-foreground text-xs border text-pretty w-64">
                {t.description}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="w-full sm:w-[320px]">
          <Select value={selectedSeriesValue} onValueChange={handleSeriesChange}>
            <SelectTrigger className="justify-between" title={selectedSeriesLabel}>
              <SelectValue placeholder={t.seriesLabel} className="truncate" />
            </SelectTrigger>
            <SelectContent
              align="end"
              className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
            >
              <SelectItem value="all" title={t.seriesAll}>
                {t.seriesAll}
              </SelectItem>
              {series.map((seriesItem) => (
                <SelectItem
                  key={seriesItem._id}
                  value={seriesItem.slug}
                  title={seriesItem.name}
                >
                  {seriesItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mb-4 w-full">
        <div className="relative flex-1">
          <Label htmlFor="teams-search" className="sr-only">
            {t.searchLabel}
          </Label>
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
          <Input
            id="teams-search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="pl-8 w-full"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
        <TeamsTable
          currentCity={currentCity}
          initialTeams={teams}
          series={series}
          seriesId={seriesId}
          searchQuery={search}
          columnHeaders={t.columnHeaders}
          endOfResults={t.endOfResults}
          noResults={t.noResults}
          sort={sort}
          onSortChange={handleSortChange}
          />
    </div>
  )
}
