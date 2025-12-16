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
import { TableWrapper } from './ui/table-wrapper'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

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
    size: 50,
    cell: ({ row }) => {
      const displayId = row.original._id.length > 6 ? `\u2026${row.original._id.slice(-5)}` : row.original._id
      const href =
        row.original._id.length > 6
          ? `https://${row.original.city.slug}.quizplease.ru/game/${row.original._id}`
          : `https://quizplease.ru/game-page?id=${row.original._id}`
      return (
        <LinkCell row={row}>
          <Link
            to={href}
            className="text-muted-foreground/60 hover:text-muted-foreground/80 hover:underline decoration-dotted font-mono text-xs/tight"
          >
            {displayId}
          </Link>
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'series.name',
    header: columnHeaders['series.name'],
    size: 300,
    cell: ({ row }) => {
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link
            className="hover:text-muted-foreground hover:underline decoration-dotted"
            to={`?q=${row.original.series.name}`}
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
    size: 100,
    cell: ({ row }) => {
      const { city, series, pack } = row.original
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link
            className="group hover:text-inherit"
            prefetch="intent"
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
    size: 100,
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
    maxSize: 150,
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
