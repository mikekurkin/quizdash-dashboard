import { Link } from '@remix-run/react'
import { RemixLinkProps } from '@remix-run/react/dist/components'
import { ColumnDef, Row } from '@tanstack/react-table'
import React from 'react'
import { InfiniteDataTable } from '~/components/ui/infinite-data-table'
import { useGames } from '~/hooks/useGames'
import { cn } from '~/lib/utils'
import type { Game } from '~/schemas/game'

const LinkCell = ({
  row,
  linkTo,
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & ({ row: Row<Game>; linkTo?: never } | { row?: never; linkTo: string }) &
  Partial<RemixLinkProps>) => {
  const to = linkTo ?? `/${row.original.city.slug}/game/${row.original._id}`
  return (
    <Link className={cn('flex items-center p-2', className)} prefetch="intent" to={to} {...props}>
      {children}
    </Link>
  )
}

const createColumns = (columnHeaders: Record<string, string>): ColumnDef<Game>[] => [
  {
    accessorKey: '_id',
    header: columnHeaders['_id'],
    maxSize: 100,
    cell: ({ row }) => {
      return <LinkCell row={row}>{row.original._id}</LinkCell>
    },
  },
  {
    accessorKey: 'series.name',
    header: columnHeaders['series.name'],
    maxSize: 150,
    cell: ({ row }) => {
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link
            className="hover:text-muted-foreground hover:underline decoration-dotted"
            to={`/${row.original.city.slug}/games?q=${row.original.series.name}`}
          >
            {row.original.series.name}
          </Link>
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'pack.formatted',
    header: columnHeaders['number'],
    maxSize: 120,
    cell: ({ row }) => {
      const { city, series, pack } = row.original
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link
            className="hover:text-muted-foreground hover:underline decoration-dotted"
            to={`/${city.slug}/pack/${series.slug}/${pack.number}`}
          >
            {pack.formatted}
          </Link>
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'date',
    header: columnHeaders['date'],
    maxSize: 150,
    cell: ({ row, getValue }) => {
      const date = getValue() as Date
      return (
        <LinkCell row={row} tabIndex={-1}>
          {date
            .toLocaleString('ru-RU', {
              year: '2-digit',
              month: 'numeric',
              day: 'numeric',
              weekday: 'short',
              hour: 'numeric',
              minute: 'numeric',
            })
            .toLowerCase()}
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'location',
    header: columnHeaders['location'],
    maxSize: 200,
    cell: ({ row }) => {
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link
            className="hover:text-muted-foreground hover:underline decoration-dotted"
            to={`/${row.original.city.slug}/games?q=${row.original.location}`}
          >
            {row.original.location}
          </Link>
        </LinkCell>
      )
    },
  },
]

export function GamesTable({
  columnHeaders,
  noResults,
  endOfResults,
}: {
  columnHeaders: Record<string, string>
  noResults: string
  endOfResults: string
}) {
  const { data: flatData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } = useGames()

  if (isError) {
    return <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  }

  const columns = createColumns(columnHeaders)

  return (
    <InfiniteDataTable
      className="max-h-[calc(100vh-10rem)]"
      columns={columns}
      data={flatData ?? []}
      hasMore={Boolean(hasNextPage)}
      isLoading={isFetchingNextPage}
      isInitialLoading={isLoading}
      onLoadMore={fetchNextPage}
      extraClassNames={{ cell: 'p-0' }}
      endOfResults={endOfResults}
      noResults={noResults}
    />
  )
}
