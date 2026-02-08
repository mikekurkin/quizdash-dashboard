import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '~/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'

export type MultiSelectOption = {
  label: string
  value: string
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void

  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean

  search?: string
  onSearchChange?: (value: string) => void
  shouldFilter?: boolean
  isLoading?: boolean

  maxSelected?: number
  onMaxSelectedReached?: (max: number) => void

  badgeClassNames?: string[]

  /**
   * Function to deterministically assign a badge class to a value.
   * Receives the value and the current selected values.
   * Defaults to simple cycling through badgeClassNames array.
   */
  resolveBadgeClass?: (value: string, selectedValues: string[], badgeClassNames: string[]) => string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
  disabled,
  search,
  onSearchChange,
  shouldFilter = true,
  isLoading,
  maxSelected,
  onMaxSelectedReached,
  badgeClassNames = [
    'bg-blue-100 text-blue-800 hover:bg-blue-200',
    'bg-green-100 text-green-800 hover:bg-green-200',
    'bg-purple-100 text-purple-800 hover:bg-purple-200',
    'bg-orange-100 text-orange-800 hover:bg-orange-200',
    'bg-pink-100 text-pink-800 hover:bg-pink-200',
  ],
  resolveBadgeClass,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [internalSearch, setInternalSearch] = useState('')

  const searchValue = search ?? internalSearch
  const setSearchValue = onSearchChange ?? setInternalSearch

  function toggleOption(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
      return
    }

    if (maxSelected && value.length >= maxSelected) {
      onMaxSelectedReached?.(maxSelected)
      return
    }

    onChange([...value, optionValue])
  }

  function removeOption(optionValue: string) {
    onChange(value.filter((v) => v !== optionValue))
  }

  const getBadgeClass = useMemo(() => {
    // Default resolver: simple cycling by selected.indexOf
    const resolver =
      resolveBadgeClass ??
      ((v: string, selected: string[], styles: string[]) => styles[selected.indexOf(v) % styles.length])

    return (v: string) => resolver(v, value, badgeClassNames)
  }, [value, badgeClassNames, resolveBadgeClass])

  const optionMap = useMemo(() => new Map(options.map((o) => [o.value, o])), [options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between min-h-10 h-auto px-2 whitespace-normal items-center')}
          disabled={disabled}
        >
          <div className="flex flex-1 min-w-0 flex-wrap gap-1.5">
            {value.length === 0 && <span className="text-muted-foreground px-1">{placeholder}</span>}
            {value.map((v) => {
              const option = optionMap.get(v)
              if (!option) return null

              return (
                <Badge
                  key={v}
                  variant="secondary"
                  className={cn('gap-1 rounded-sm pl-[0.3rem] pr-[0.15rem]', getBadgeClass(v))}
                >
                  {option.label}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${option.label}`}
                    className="rounded-[0.35rem] hover:bg-muted/60 dark:hover:bg-muted/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeOption(v)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        removeOption(v)
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              )
            })}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {value.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear all"
                className="rounded-[0.35rem] p-0.5 hover:bg-muted/60 dark:hover:bg-muted/20"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange([])
                  }
                }}
              >
                <X className="h-4 w-4 opacity-70" />
              </span>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronDown className="h-4 w-4 opacity-50" />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={shouldFilter}>
          <CommandInput value={searchValue} onValueChange={setSearchValue} placeholder={searchPlaceholder} />
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => {
              const isSelected = value.includes(option.value)
              const isDisabled = !isSelected && maxSelected !== undefined && value.length >= maxSelected

              return (
                <CommandItem key={option.value} onSelect={() => toggleOption(option.value)} disabled={isDisabled}>
                  <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/*
CLIENT-SIDE USAGE

<BaseMultiSelect
  options={options}
  value={value}
  onChange={setValue}
/>
*/
