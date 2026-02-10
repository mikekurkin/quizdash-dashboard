import { Link } from '@remix-run/react'
import { ArrowDown } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { InfiniteDataTable } from '~/components/ui/infinite-data-table'
import { TableWrapper } from '~/components/ui/table-wrapper'
import { Button } from '~/components/ui/button'
import { useTeams } from '~/hooks/useTeams'
import { City } from '~/schemas/city'
import { Series } from '~/schemas/series'
import { Team } from '~/schemas/team'

type ColumnHeaders = {
  index: string
  team: string
  games: string
  totalPoints: string
  avgResult: string
  bestResult: string
}

type TeamsTableProps = {
  currentCity: City
  initialTeams: { data: Team[]; nextCursor?: string | null }
  series: Series[]
  seriesId: string | null
  searchQuery: string
  columnHeaders: ColumnHeaders
  endOfResults: string
  noResults: string
  sort: string
  onSortChange: (key: string) => void
}

export function TeamsTable({
  currentCity,
  initialTeams,
  series,
  seriesId,
  searchQuery,
  columnHeaders,
  endOfResults,
  noResults,
  sort,
  onSortChange,
}: TeamsTableProps) {
  const seriesTotals = useMemo(
    () =>
      new Map(
        series.map((item) => [item._id, (item.maxRoundSums ?? []).reduce((sum, v) => sum + v, 0)])
      ),
    [series]
  )

  const getMetrics = useCallback(
    (team: Team) => (seriesId ? team.metrics?.series?.[seriesId] : team.metrics),
    [seriesId]
  )

  const columns = useMemo<ColumnDef<Team>[]>(() => {
    const sortableHeader = (label: string, key: string) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => onSortChange(key)}
      >
        <span>{label}</span>
        {sort === key ? (
          <ArrowDown className="ml-2 h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="ml-2 h-3.5 w-3.5 opacity-40" />
        )}
      </Button>
    )

    return [
      {
        id: 'rank',
        header: () => columnHeaders.index,
        size: 40,
        cell: ({ row }) => {
          if (searchQuery.trim().length > 0) return ''
          return row.index + 1
        },
      },
      {
        accessorKey: 'name',
        header: () => columnHeaders.team,
        meta: { disableWidth: true },
        cell: ({ row }) => {
          const team = row.original
          const href = team.city?.slug ? `/${team.city.slug}/team/${team.slug}` : undefined
          return href ? (
            <Link to={href} className="hover:underline decoration-dotted">
              {team.name}
            </Link>
          ) : (
            team.name
          )
        },
      },
      {
        accessorKey: 'metrics.gamesCount',
        header: () => sortableHeader(columnHeaders.games, 'games'),
        size: 100,
        cell: ({ row }) => {
          const metrics = getMetrics(row.original)
          return metrics?.gamesCount ?? 0
        },
      },
      {
        accessorKey: 'metrics.sumTotal',
        header: () => sortableHeader(columnHeaders.totalPoints, 'sum_total'),
        size: 100,
        cell: ({ row }) => {
          const metrics = getMetrics(row.original)
          const value = metrics?.sumTotal ?? 0
          return value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        },
      },
      {
        accessorKey: 'metrics.avgSum',
        header: () => sortableHeader(columnHeaders.avgResult, 'avg_sum'),
        size: 100,
        cell: ({ row }) => {
          const metrics = getMetrics(row.original)
          const value = metrics?.avgSum ?? 0
          return value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        },
      },
      {
        accessorKey: 'metrics.bestSum',
        header: () => sortableHeader(columnHeaders.bestResult, 'best_sum'),
        size: 100,
        cell: ({ row }) => {
          const team = row.original
          const metrics = getMetrics(team)
          const bestSum = metrics?.bestSum ?? null
          const bestGameId = metrics?.bestGameId ?? null
          const bestSeriesId = seriesId ?? team.metrics?.bestSeriesId ?? null
          const total = bestSeriesId ? seriesTotals.get(bestSeriesId) : undefined
          const isTotal = total !== undefined && bestSum === total

          if (bestSum === null) return '—'

          const href = bestGameId && team.city?.slug ? `/${team.city.slug}/game/${bestGameId}` : undefined
          const content = bestSum.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

          return href ? (
            <Link
              to={href}
              className={[
                'inline-flex items-center rounded-sm px-1 py-0.5 hover:underline decoration-dotted',
                isTotal ? 'bg-yellow-400 text-foreground dark:text-primary-foreground' : '',
              ].join(' ')}
            >
              {content}
            </Link>
          ) : (
            <span
              className={[
                'inline-flex items-center rounded-sm px-1 py-0.5',
                isTotal ? 'bg-yellow-400 text-foreground dark:text-primary-foreground' : '',
              ].join(' ')}
            >
              {content}
            </span>
          )
        },
      },
    ]
  }, [columnHeaders, getMetrics, seriesId, seriesTotals, sort, onSortChange, searchQuery])

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useTeams(
    currentCity,
    initialTeams as { data: Team[]; nextCursor?: string | null }
  )

  return (
    <TableWrapper heightClassName="max-sm:max-h-[calc(100dvh-16rem)]">
      <InfiniteDataTable
        className="overflow-x-auto table-fixed min-w-[720px]"
        columns={columns}
        data={data ?? []}
        hasMore={Boolean(hasNextPage)}
        isLoading={isFetching}
        isInitialLoading={isLoading}
        onLoadMore={() => fetchNextPage()}
        endOfResults={endOfResults}
        noResults={noResults}
      />
    </TableWrapper>
  )
}
