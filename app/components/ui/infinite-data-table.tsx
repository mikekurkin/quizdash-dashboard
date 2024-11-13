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
    endOfResultsRow?: string
    noResultsRow?: string
  }
  endOfResults?: React.ReactNode
  noResults?: React.ReactNode
}

export function InfiniteDataTable<TData, TValue>({
  className,
  columns,
  data,
  hasMore,
  isLoading,
  isInitialLoading,
  onLoadMore,
  extraClassNames,
  endOfResults,
  noResults = 'No results',
}: InfiniteDataTableProps<TData, TValue>) {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  useEffect(() => {
    const scrollElement = tableContainerRef.current
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
    <div className="rounded-md border overflow-hidden">
      <div ref={tableContainerRef} className={cn('overflow-auto relative', className)}>
        <Table className={extraClassNames?.table}>
          <TableHeader className={cn('sticky top-0 z-10', extraClassNames?.header)}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={cn('border-b', extraClassNames?.row)}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={extraClassNames?.head}>
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
              // Data rows
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={extraClassNames?.row}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell className={extraClassNames?.cell} key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* Loading more indicator */}
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
      </div>
    </div>
  )
}
