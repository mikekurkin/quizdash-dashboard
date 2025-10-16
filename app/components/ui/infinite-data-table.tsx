import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useCallback, useEffect, useRef } from 'react'
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
  const sentinelRef = useRef<HTMLTableRowElement>(null)
  const loadingRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isMountedRef = useRef(false)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Handle loading more data when sentinel is in view
  const handleLoadMore = useCallback(() => {
    if (loadingRef.current || !hasMore || isLoading || !isMountedRef.current) return

    loadingRef.current = true
    onLoadMore()

    // Reset loading state after the load is complete
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        loadingRef.current = false
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [hasMore, isLoading, onLoadMore])

  // Set up intersection observer
  useEffect(() => {
    isMountedRef.current = true
    const sentinel = sentinelRef.current

    if (!sentinel) return

    // Create a new observer for this instance
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && isMountedRef.current) {
          handleLoadMore()
        }
      },
      {
        root: null, // viewport
        rootMargin: '60%',
        threshold: 0.1,
      }
    )

    // Start observing the sentinel
    observer.observe(sentinel)

    // Store the observer in ref for cleanup
    observerRef.current = observer

    // Cleanup
    return () => {
      isMountedRef.current = false
      observer.disconnect()
      loadingRef.current = false
    }
  }, [handleLoadMore])

  return (
    <Table className={className}>
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
                {/* Loading skeleton rows */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const isLast = i === 4
                  return (
                    <TableSkeletonRow
                      key={`skeleton-${i}`}
                      ref={isLast ? sentinelRef : undefined}
                      columns={columns.length}
                      index={i + table.getRowCount()}
                      dataSentinel={isLast}
                    />
                  )
                })}
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
