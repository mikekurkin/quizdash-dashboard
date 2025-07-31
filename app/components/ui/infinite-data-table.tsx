import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useEffect, useRef } from 'react'
import { cn } from '~/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { TableSkeletonRow } from './table-skeleton-row'

interface InfiniteDataTableProps<TData, TValue> {
  className?: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  hasMore: boolean
  isLoading: boolean
  isInitialLoading: boolean
  onLoadMore: () => void
  extraClassNames?: {
    table?: string
    header?: string
    body?: string
    row?: string
    head?: string
    cell?: string
    noResultsRow?: string
    endOfResultsRow?: string
  }
  endOfResults?: React.ReactNode
  noResults?: React.ReactNode
}

export function InfiniteDataTable<TData, TValue>({
  columns,
  data,
  className,
  extraClassNames,
  noResults = 'No results',
  hasMore,
  isLoading,
  isInitialLoading,
  onLoadMore,
  endOfResults,
}: InfiniteDataTableProps<TData, TValue>) {
  const tableRef = useRef<HTMLTableElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  useEffect(() => {
    const scrollElement = tableRef.current
    if (!scrollElement || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: '300px', threshold: 0 }
    )

    const sentinel = scrollElement.querySelector('[data-sentinel]')
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  return (
    <Table ref={tableRef} className={className}>
      <TableHeader className={cn('bg-background z-10 sticky top-0 sm:top-14', extraClassNames?.header)}>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className={cn('border-b hover:bg-inherit', extraClassNames?.row)}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={extraClassNames?.head}
                style={{
                  width: header.getSize(),
                }}
              >
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className={extraClassNames?.body}>
        {isInitialLoading ? (
          Array.from({ length: 10 }).map((_, i) => <TableSkeletonRow key={i} columns={columns.length} index={i} />)
        ) : table.getRowModel().rows?.length ? (
          <>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className={extraClassNames?.row}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    className={cn(extraClassNames?.cell)}
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {(hasMore || isLoading) && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableSkeletonRow
                    key={i}
                    columns={columns.length}
                    index={i + table.getRowCount()}
                    dataSentinel={i === 3}
                  />
                ))}
              </>
            )}
            {!hasMore && !isLoading && endOfResults && (
              <TableRow className={cn('hover:bg-transparent', extraClassNames?.endOfResultsRow)}>
                <TableCell
                  colSpan={columns.length}
                  className={cn('h-12 text-center text-sm text-muted-foreground', extraClassNames?.cell)}
                >
                  {endOfResults}
                </TableCell>
              </TableRow>
            )}
          </>
        ) : (
          <TableRow className={cn('hover:bg-transparent', extraClassNames?.noResultsRow)}>
            <TableCell
              colSpan={columns.length}
              className={cn('h-24 text-center text-sm text-muted-foreground', extraClassNames?.cell)}
            >
              {noResults}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
