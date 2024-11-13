import { Form, useSearchParams, useSubmit } from '@remix-run/react'
import { format } from 'date-fns'
import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DateRange } from 'react-day-picker'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '~/lib/utils'
import { Button } from './ui/button'
import { DateRangePicker } from './ui/date-range-picker'
import { Input } from './ui/input'
import { Label } from './ui/label'

export function SearchForm({
  query,
  fromDate,
  toDate,
  label,
  searchPlaceholder,
  selectDatePlaceholder,
  className,
}: {
  query?: string
  fromDate?: string
  toDate?: string
  label: string
  searchPlaceholder: string
  selectDatePlaceholder: string
  className?: string
}) {
  const submit = useSubmit()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(query || '')
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (fromDate && toDate) {
      return {
        from: new Date(fromDate),
        to: new Date(toDate),
      }
    }
    return undefined
  })

  // Update search from URL params
  useEffect(() => {
    const queryParam = searchParams.get('q')
    if (queryParam !== null && queryParam !== search) {
      setSearch(queryParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Debounced form submission
  const debouncedSubmit = useDebouncedCallback((searchValue: string, dateRange?: DateRange) => {
    submitSearch(searchValue, dateRange)
  }, 300)

  // Direct form submission without debounce
  const submitSearch = (searchValue: string, dateRange?: DateRange) => {
    const formData = new FormData()
    if (searchValue) formData.append('q', searchValue)
    if (dateRange?.from) formData.append('from', format(dateRange.from, 'yyyy-MM-dd'))
    if (dateRange?.to) formData.append('to', format(dateRange.to, 'yyyy-MM-dd'))

    submit(formData, {
      method: 'get',
      replace: true,
    })
  }

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    setSearch(value)
    debouncedSubmit(value, date)
  }

  // Handle date changes
  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate)
    debouncedSubmit(search, newDate)
  }

  return (
    <Form className={cn('flex gap-2', className)}>
      <div className="relative flex-1">
        <Label htmlFor="search" className="sr-only">
          {label}
        </Label>
        <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
        <Input
          id="search"
          name="q"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <DateRangePicker
          initialDate={date}
          onDateChange={handleDateChange}
          selectDatePlaceholder={selectDatePlaceholder}
          align="end"
        />
      </div>
    </Form>
  )
}
