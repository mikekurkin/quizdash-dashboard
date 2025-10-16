import { CalendarSearch, X } from 'lucide-react'
import * as React from 'react'
import { DateRange } from 'react-day-picker'

import { cn } from '~/lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export function DateRangePicker({
  className,
  align = 'center',
  selectDatePlaceholder = 'Select a date',
  initialDate = undefined,
  onDateChange = undefined,
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'center' | 'end'
  selectDatePlaceholder?: string
  initialDate?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
}) {
  const [date, setDate] = React.useState<DateRange | undefined>(initialDate)
  const [open, setOpen] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout>()
  const [suspendHover, setSuspendHover] = React.useState(false)

  React.useEffect(() => setDate(initialDate), [initialDate])

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 400) // Small delay to prevent flickering when moving between trigger and content
  }

  const handleChange = (date: DateRange | undefined) => {
    setDate(date)
    onDateChange?.(date)
  }

  const handleClear = () => {
    handleChange(undefined)
    setOpen(false)
    setSuspendHover(true)
    setTimeout(() => {
      setSuspendHover(false)
    }, 100)
  }

  React.useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'ghost'}
            className={cn('w-10 p-0', date ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <CalendarSearch className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align={align}
          onMouseEnter={suspendHover ? undefined : handleMouseEnter}
          onMouseLeave={suspendHover ? undefined : handleMouseLeave}
        >
          <div className="p-3 flex items-center justify-between border-b">
            <div className="text-sm h-6 mx-2">
              {date?.from ? (
                <span>
                  {date.from.toLocaleDateString()}&nbsp;&ndash;&nbsp;
                  {date.to?.toLocaleDateString()}
                </span>
              ) : (
                <span>{selectDatePlaceholder}</span>
              )}
            </div>
            {date && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
