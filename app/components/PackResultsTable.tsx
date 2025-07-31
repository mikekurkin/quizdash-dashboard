import { Link } from '@remix-run/react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '~/components/ui/data-table'
import { TableWrapper } from '~/components/ui/table-wrapper'
import type { GameResult } from '~/schemas/gameResult'

const createGameResultsColumns = (
  columnHeaders: Record<string, string>,
  results: GameResult[]
): ColumnDef<GameResult>[] => {
  const baseColumns: ColumnDef<GameResult>[] = [
    {
      accessorKey: 'metrics.pack_place',
      header: columnHeaders['place'] || '#',
      maxSize: 80,
    },
    {
      accessorKey: 'team.name',
      header: columnHeaders['team'] || 'Team',
      maxSize: 200,
      cell: ({ row }) => {
        const {
          game: { city },
          team,
        } = row.original
        return (
          <Link
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
    maxSize: 60,
  }))

  const finalColumns: ColumnDef<GameResult>[] = [
    {
      accessorKey: 'sum',
      header: columnHeaders['sum'] || 'Sum',
      maxSize: 100,
    },
    {
      accessorKey: 'metrics.game_efficiency',
      header: columnHeaders['efficiency'] || 'Efficiency',
      maxSize: 120,
      cell: ({ row }) => `${(row.original.metrics.pack_efficiency * 100).toFixed(1)}%`,
    },
  ]

  return [...baseColumns, ...roundColumns, ...finalColumns]
}

interface PackResultsTableProps {
  results: GameResult[]
  columnHeaders: Record<string, string>
  noResults?: React.ReactNode
  className?: string
}

export function PackResultsTable({ results, columnHeaders = {}, noResults }: PackResultsTableProps) {
  const columns = createGameResultsColumns(columnHeaders, results)

  return (
    <TableWrapper heightClassName="max-sm:max-h-[calc(100dvh-10rem)]">
      <DataTable
        columns={columns}
        data={results}
        noResults={noResults}
        extraClassNames={{
          header: 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          row: '',
        }}
      />
    </TableWrapper>
  )
}
