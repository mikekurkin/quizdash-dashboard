import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { MultiSelect, MultiSelectOption, MultiSelectProps } from './multi-select'

type AsyncMultiSelectProps = Omit<MultiSelectProps, 'options' | 'isLoading'> & {
  queryKey: string
  queryFn: (search: string) => Promise<MultiSelectOption[]>
  debounceMs?: number
  initialOptions?: MultiSelectOption[]
}

export function AsyncMultiSelect({
  queryKey,
  queryFn,
  debounceMs = 300,
  initialOptions,
  search,
  onSearchChange,
  shouldFilter = false,
  ...props
}: AsyncMultiSelectProps) {
  const [internalSearch, setInternalSearch] = useState('')
  const searchValue = search ?? internalSearch
  const setSearchValue = onSearchChange ?? setInternalSearch
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Cache all options we've ever seen (value -> option)
  const [optionCache, setOptionCache] = useState(
    () => new Map((initialOptions ?? []).map((option) => [option.value, option]))
  )

  useEffect(() => {
    if (!initialOptions?.length) return
    setOptionCache((prev) => {
      const next = new Map(prev)
      for (const option of initialOptions) {
        next.set(option.value, option)
      }
      return next
    })
  }, [initialOptions])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchValue), debounceMs)
    return () => clearTimeout(id)
  }, [searchValue, debounceMs])

  const { data = [], isLoading } = useQuery({
    queryKey: [queryKey, debouncedSearch],
    queryFn: () => queryFn(debouncedSearch),
    placeholderData: (previous) => previous,
  })

  // Hydrate cache with fetched options
  useEffect(() => {
    if (!data.length) return

    setOptionCache((prev) => {
      const next = new Map(prev)
      for (const option of data) {
        next.set(option.value, option)
      }
      return next
    })
  }, [data])

  // Merge + pin selected options (with labels)
  const mergedOptions = useMemo<MultiSelectOption[]>(() => {
    const selected: MultiSelectOption[] = []
    const unselected: MultiSelectOption[] = []

    const seen = new Set<string>()

    // First: selected options from current data
    for (const option of data) {
      if (props.value.includes(option.value)) {
        selected.push(option)
        seen.add(option.value)
      } else {
        unselected.push(option)
        seen.add(option.value)
      }
    }

    // Then: selected options not in current result set (from cache)
    for (const v of props.value) {
      if (!seen.has(v)) {
        const cached = optionCache.get(v)
        if (cached) selected.push(cached)
      }
    }

    return [...selected, ...unselected]
  }, [data, props.value, optionCache])

  return (
    <MultiSelect
      options={mergedOptions}
      search={searchValue}
      onSearchChange={setSearchValue}
      shouldFilter={shouldFilter}
      isLoading={isLoading}
      {...props}
    />
  )
}

/*

  SERVER-SIDE (REMIX + TANSTACK QUERY)

    <AsyncMultiSelect
    queryKey="tags"
    queryFn={fetchTags}
    value={value}
    onChange={setValue}
    />

*/
