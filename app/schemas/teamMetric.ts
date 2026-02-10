import { z } from 'zod'

export const TeamSeriesMetricSchema = z.object({
  gamesCount: z.number(),
  sumTotal: z.number(),
  placeTotal: z.number(),
  avgSum: z.number(),
  avgPlace: z.number(),
  bestSum: z.number(),
  bestGameId: z.string().nullish(),
  roundsCount: z.number(),
  avgRounds: z.array(z.number()),
})

export const TeamMetricSchema = z.object({
  gamesCount: z.number(),
  sumTotal: z.number(),
  placeTotal: z.number(),
  avgSum: z.number(),
  avgPlace: z.number(),
  bestSum: z.number(),
  bestGameId: z.string().nullish(),
  bestSeriesId: z.string().nullish(),
  series: z.record(z.string(), TeamSeriesMetricSchema),
})

export type TeamMetric = z.infer<typeof TeamMetricSchema>
