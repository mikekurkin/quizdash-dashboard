import { z } from 'zod'

export const defaultTopNAvg = {
  n: 0,
  sum: null,
  rounds: [],
}

export const defaultGameMetric = {
  sum: null,
  rounds: [],
}

export const TopNAvgSchema = z.object({
  n: z.number().default(defaultTopNAvg.n),
  sum: z.number().nullable().default(defaultTopNAvg.sum),
  rounds: z.array(z.number()).default(defaultTopNAvg.rounds),
})

export const GameMetricSchema = z.object({
  sum: z.number().nullable().default(defaultGameMetric.sum),
  rounds: z.array(z.number()).default(defaultGameMetric.rounds),
})

export type TopNAvg = z.infer<typeof TopNAvgSchema>
export type GameMetric = z.infer<typeof GameMetricSchema>
