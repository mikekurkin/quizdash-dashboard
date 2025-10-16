import { Link } from '@remix-run/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '~/components/ui/data-table'
import { cn } from '~/lib/utils'
import type { GameResult } from '~/schemas/gameResult'
import { TableWrapper } from './ui/table-wrapper'

export const createGameResultsColumns = (
  columnHeaders: Record<string, string>,
  results: GameResult[]
): ColumnDef<GameResult>[] => {
  const baseColumns: ColumnDef<GameResult>[] = [
    {
      accessorKey: 'place',
      header: columnHeaders['place'] || '#',
      size: 80,
      cell: ({ row }) => row.original.place,
    },
    {
      accessorKey: 'team.name',
      header: columnHeaders['team'] || 'Team',
      size: 400,
      cell: ({ row }) => {
        const {
          game: { city },
          team,
        } = row.original
        return (
          <Link
            prefetch="intent"
            className="hover:text-muted-foreground hover:underline decoration-dotted"
            to={`/${city.slug}/team/${team.slug}`}
          >
            {row.original.team.name}
          </Link>
        )
      },
    },
  ]

  const maxRounds = Math.max(...results.map((result) => result.rounds.length), 0)

  const roundColumns: ColumnDef<GameResult>[] = Array.from({ length: maxRounds }).map((_, index) => ({
    accessorFn: (row) => row.rounds[index],
    header: (index + 1).toString(),
    size: 50,
  }))

  const finalColumns: ColumnDef<GameResult>[] = [
    {
      accessorKey: 'sum',
      header: columnHeaders['sum'] || 'Sum',
      maxSize: 100,
      cell: ({ row }) => row.original.sum,
    },
    {
      accessorKey: 'metrics.game_efficiency',
      header: columnHeaders['efficiency'] || 'Efficiency',
      maxSize: 120,
      cell: ({ row }) => `${(row.original.metrics.game_efficiency * 100).toFixed(1)}%`,
    },
  ]

  return [...baseColumns, ...roundColumns, ...finalColumns]
}

interface GameResultsTableProps {
  results: GameResult[]
  columnHeaders?: Record<string, string>
  className?: string
  noResults?: React.ReactNode
}

export function GameResultsTable({ results, columnHeaders = {}, noResults, className }: GameResultsTableProps) {
  const columns = createGameResultsColumns(columnHeaders, results)

  return (
    <TableWrapper heightClassName="max-sm:max-h-[calc(100dvh-10rem)]">
      <DataTable
        className={cn('overflow-y-auto overflow-x-scroll', className)}
        columns={columns}
        data={results}
        noResults={noResults}
        extraClassNames={{
          header: 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          row: 'overflow-x-auto',
        }}
      />
    </TableWrapper>
  )
}
