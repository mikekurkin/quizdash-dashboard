import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
