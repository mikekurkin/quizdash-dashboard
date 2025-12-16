import { z } from 'zod'
import { defaultGameMetric, defaultTopNAvg, GameMetricSchema, TopNAvgSchema } from './gameMetric'

export const defaultPackMetrics = {
  topNAvg: defaultTopNAvg,
  prevCount: 0,
  complexityGrade: defaultGameMetric,
}

export const PackMetricsSchema = z
  .object({
    topNAvg: TopNAvgSchema,
    prevCount: z.number(),
    complexityGrade: GameMetricSchema,
  })
  .default(defaultPackMetrics)

export const BasePackSchema = z.object({
  _id: z.string(),
  number: z.string(),
  replay_number: z.number(),
  formatted: z.string(),
})

export const PackWithMetricsSchema = BasePackSchema.extend({
  metrics: PackMetricsSchema,
})

export type BasePack = z.infer<typeof BasePackSchema>
export type Pack = z.infer<typeof PackWithMetricsSchema>
export type PackMetrics = z.infer<typeof PackMetricsSchema>
