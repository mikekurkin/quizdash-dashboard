import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { cn } from '~/lib/utils'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  className?: string
  extraClassNames?: {
    table?: string
    header?: string
    body?: string
    row?: string
    head?: string
    cell?: string
  }
  noResults?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  extraClassNames,
  noResults = 'No results',
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table className={className}>
      <TableHeader className={cn('bg-background z-10 sticky top-0 sm:top-14', extraClassNames?.header)}>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className={cn('border-b', extraClassNames?.row)}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn('bg-background', extraClassNames?.head)}
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
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className={extraClassNames?.row}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={extraClassNames?.cell} style={{ width: cell.column.getSize() }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow className="hover:bg-transparent">
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
