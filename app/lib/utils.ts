import lowess from '@stdlib/stats-lowess'
import { clsx, type ClassValue } from 'clsx'
import { DateRange } from 'react-day-picker'
import { kernelDensityEstimation } from 'simple-statistics'
import { twMerge } from 'tailwind-merge'
import { MinimalGameResult } from '~/schemas/gameResult'
import { Series } from '~/schemas/series'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const compareRounds = (aRounds: number[], bRounds: number[]) => {
  return aRounds.reduceRight((acc, roundA, index) => {
    const roundB = bRounds[bRounds.length - 1 - index] || 0
    if (roundA !== roundB) {
      return roundB - roundA
    }
    return acc
  }, 0)
}

type SmoothingData = { date: number } & Record<string, unknown>
// Define the Options type based on the lowess library interface
interface LowessOptions {
  f?: number
  nsteps?: number
  delta?: number
  sorted?: boolean
}

export const addLowess = <
  T extends SmoothingData,
  K extends Exclude<keyof T, 'date'> & keyof { [P in keyof T as T[P] extends number ? P : never]: unknown },
>(
  data: T[],
  keysToSmooth: K[],
  options?: LowessOptions
): (T & { [P in K as `${string & P}_lowess`]: number })[] => {
  if (data.length <= 1 || keysToSmooth.length === 0)
    return data as (T & { [P in K as `${string & P}_lowess`]: number })[]
  const smoothedData = [...data] as (T & { [P in K as `${string & P}_lowess`]: number })[]
  new Set(keysToSmooth).forEach((key) => {
    const lowessDataSum = data.map((result) => ({ x: result.date, y: result[key] }))
    const xs = lowessDataSum.map((res) => res.x)
    const ys = lowessDataSum.map((res) => res.y)
    const lowessResult = lowess(xs, ys, options ?? {})
    const smoothedYs = lowessResult.y

    // Add the smoothed values to each data item
    smoothedData.forEach((item, index) => {
      const smoothedKey = `${String(key)}_lowess`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(item as any)[smoothedKey] = smoothedYs[index]
    })
  })

  return smoothedData
}

export const estimateDensities = <T extends Record<string, number>, K extends keyof T>(
  data: T[],
  keys: K[],
  range: { min: number; max: number }
): ({ value: number } & { [P in K as `${string & P}_density`]: number })[] => {
  const kdeFns = keys.map((key) => {
    const values = data.map((res) => res[key])
    return [
      key,
      values.length > 1
        ? kernelDensityEstimation(values)
        : values.length === 1
          ? (n: number) => (n === values[0] ? 1 : 0)
          : (_: number) => 0,
    ] as [K, (x: number) => number]
  })

  return Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i).map((value) => ({
    value,
    ...(Object.fromEntries(kdeFns.map(([key, fn]) => [`${String(key)}_density`, fn(value)])) as {
      [P in K as `${string & P}_density`]: number
    }),
  }))
}

// // source: https://stackoverflow.com/a/52613386
export function getMax(arr: number[]) {
  let len = arr.length
  let max = -Infinity

  while (len--) {
    max = arr[len] > max ? arr[len] : max
  }
  return max
}

export const filterAndSortSeries = (results: MinimalGameResult[], series: Series[], newDate: DateRange | null) => {
  const filtered = results.filter((result) => {
    if (newDate?.from && result.game_date.getTime() <= newDate.from.getTime()) return false
    if (newDate?.to && result.game_date.getTime() >= newDate.to.getTime()) return false
    return true
  })

  const sortedSeries = [
    ...filtered
      .map((result) => result.game_series_id)
      .reduce(
        (acc, id) =>
          acc.set(id, { count: (acc.get(id)?.count || 0) + 1, series: series.find((s) => s._id === id) ?? null }),
        new Map<string, { count: number; series: Series | null }>()
      )
      .values(),
  ].sort((a, b) => b.count - a.count)

  return { filtered, sortedSeries }
}
