import { z } from 'zod'

export const BaseSeriesSchema = z.object({
  _id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
})

export const SeriesMetricsSchema = z.object({
  maxSum: z.number().default(0),
  maxSumId: z.string().nullish(),
  roundsCount: z.number().default(0),
  maxRoundSums: z.array(z.number()).default([]),
  maxRoundSumIds: z.array(z.number()).default([]),
})

export const SeriesSchema = BaseSeriesSchema.merge(SeriesMetricsSchema)

export type BaseSeries = z.infer<typeof BaseSeriesSchema>
export type SeriesMetrics = z.infer<typeof SeriesMetricsSchema>
export type Series = z.infer<typeof SeriesSchema>
