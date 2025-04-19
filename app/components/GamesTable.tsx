import { Link } from '@remix-run/react'
import { RemixLinkProps } from '@remix-run/react/dist/components'
import { ColumnDef, Row } from '@tanstack/react-table'
import React from 'react'
import { InfiniteDataTable } from '~/components/ui/infinite-data-table'
import { useGames } from '~/hooks/useGames'
import { cn } from '~/lib/utils'
import { City } from '~/schemas/city'
import type { Game, GamesResponse } from '~/schemas/game'
import { ComplexityGrade } from './ComplexityGrade'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { TableWrapper } from './ui/table-wrapper'

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

  // Check if children contain a Link component
  const hasNestedLink = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === Link
  )

  if (hasNestedLink) {
    return (
      <div className="relative p-2">
        <Link className={cn('absolute inset-0 z-[2]', className)} prefetch="intent" to={to} {...props} />
        <div className="relative z-[5] w-fit">{children}</div>
      </div>
    )
  }

  return (
    <Link className={cn('block p-2', className)} prefetch="intent" to={to} {...props}>
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
            className="group hover:text-inherit"
            to={`/${city.slug}/pack/${series.slug}/${pack.number}`}
          >
            <span className="group-hover:text-muted-foreground group-hover:underline decoration-dotted">{`#${pack.number}`}</span>
            <span>{`.${pack.replay_number}`}</span>
          </Link>
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'pack.derived.complexityGrade.sum',
    header: columnHeaders['complexity'],
    maxSize: 120,
    cell: ({ row }) => {
      const { prevCount } = row.original.pack.metrics
      const { sum } = row.original.pack.metrics.complexityGrade
      return (
        <LinkCell row={row} tabIndex={-1}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex flex-1 w-full h-full">
                {sum !== null && prevCount >= 5 ? (
                  <span>{`${sum}\u00A0/\u00A010`}</span>
                ) : (
                  <span className="text-muted-foreground/60">{`?\u00A0/\u00A010`}</span>
                )}
              </TooltipTrigger>
              <TooltipContent className="z-20 bg-card text-card border">
                {sum === null ? (
                  <div className="text-card-foreground text-xs">Нет результатов</div>
                ) : prevCount < 5 ? (
                  <div className="text-card-foreground text-xs">Мало пакетов в серии</div>
                ) : (
                  <ComplexityGrade inTooltip metrics={row.original.pack.metrics} />
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          {/* TODO: format in city's timezone */}
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
  currentCity,
  initialGames,
  columnHeaders,
  noResults,
  endOfResults,
}: {
  currentCity: City
  initialGames: GamesResponse
  columnHeaders: Record<string, string>
  noResults: string
  endOfResults: string
}) {
  const {
    data: flatData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useGames(currentCity, initialGames)

  if (isError) {
    return <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  }

  const columns = createColumns(columnHeaders)

  return (
    <TableWrapper heightClassName="max-sm:max-h-[calc(100dvh-12rem)]">
      <InfiniteDataTable
        className="overflow-x-auto"
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
    </TableWrapper>
  )
}
