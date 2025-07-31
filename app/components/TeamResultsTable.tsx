import { Link } from '@remix-run/react'
import { RemixLinkProps } from '@remix-run/react/dist/components'
import { ColumnDef, Row } from '@tanstack/react-table'
import React from 'react'
import { cn } from '~/lib/utils'
import { City } from '~/schemas/city'
import type { GameResult } from '~/schemas/gameResult'
import { ComplexityGrade } from './ComplexityGrade'
import { DataTable } from './ui/data-table'
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
} & ({ row: Row<GameResult>; linkTo?: never } | { row?: never; linkTo: string }) &
  Partial<RemixLinkProps>) => {
  const to = linkTo ?? `/${row.original.game.city.slug}/game/${row.original.game._id}`

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

const createColumns = (columnHeaders: Record<string, string>): ColumnDef<GameResult>[] => [
  {
    accessorKey: 'game._id',
    header: columnHeaders['_id'],
    size: 50,
    cell: ({ row }) => {
      return <LinkCell row={row}>{row.original.game._id}</LinkCell>
    },
  },
  {
    accessorKey: 'game.series.name',
    header: columnHeaders['series.name'],
    size: 300,
    cell: ({ row }) => {
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link
            className="hover:text-muted-foreground hover:underline decoration-dotted"
            to={`/${row.original.game.city.slug}/games?q=${row.original.game.series.name}`}
          >
            {row.original.game.series.name}
          </Link>
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'game.pack.formatted',
    header: columnHeaders['number'],
    maxSize: 100,
    cell: ({ row }) => {
      const { city, series, pack } = row.original.game
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link className="group hover:text-inherit" to={`/${city.slug}/pack/${series.slug}/${pack.number}`}>
            <span className="group-hover:text-muted-foreground group-hover:underline decoration-dotted">{`#${pack.number}`}</span>
            <span>{`.${pack.replay_number}`}</span>
          </Link>
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'game.pack.derived.complexityGrade.sum',
    header: columnHeaders['complexity'],
    size: 100,
    cell: ({ row }) => {
      const { prevCount } = row.original.game.pack.metrics
      const { sum } = row.original.game.pack.metrics.complexityGrade
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
                  <ComplexityGrade inTooltip metrics={row.original.game.pack.metrics} />
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'game.date',
    header: columnHeaders['date'],
    size: 150,
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
    accessorKey: 'game.location',
    header: columnHeaders['location'],
    size: 150,
    cell: ({ row }) => {
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link
            className="hover:text-muted-foreground hover:underline decoration-dotted"
            to={`/${row.original.game.city.slug}/games?q=${row.original.game.location}`}
          >
            {row.original.game.location}
          </Link>
        </LinkCell>
      )
    },
  },
  {
    accessorKey: 'sum',
    header: columnHeaders['sum'],
    size: 80,
    cell: ({ row }) => {
      return <LinkCell row={row}>{row.original.sum}</LinkCell>
    },
  },
  {
    accessorKey: 'place',
    header: columnHeaders['place'],
    size: 40,
    cell: ({ row }) => {
      return <LinkCell row={row}>{row.original.place}</LinkCell>
    },
  },
  {
    accessorKey: 'metrics.pack_place',
    header: columnHeaders['pack_place'],
    size: 40,
    cell: ({ row }) => {
      const { city, series, pack } = row.original.game
      return (
        <LinkCell row={row} tabIndex={-1}>
          <Link
            className="hover:text-muted-foreground hover:underline decoration-dotted"
            to={`/${city.slug}/pack/${series.slug}/${pack.number}`}
          >
            {row.original.metrics.pack_place}
          </Link>
        </LinkCell>
      )
    },
  },
]

export function TeamResultsTable({
  results,
  columnHeaders,
}: {
  currentCity: City
  results: GameResult[]
  columnHeaders: Record<string, string>
}) {
  const columns = createColumns(columnHeaders)

  return (
    <TableWrapper heightClassName="max-sm:max-h-[calc(100dvh-12rem)]">
      <DataTable className="overflow-x-auto" columns={columns} data={results} extraClassNames={{ cell: 'p-0' }} />
    </TableWrapper>
  )
}
