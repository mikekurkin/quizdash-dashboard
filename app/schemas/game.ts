import { z } from 'zod'
import { CitySchema } from './city'
import { defaultTopNAvg, TopNAvgSchema } from './gameMetric'
import { BasePackSchema, PackWithMetricsSchema } from './pack'
import { SeriesSchema } from './series'

export const defaultGameMetrics = {
  gameTopNAvg: defaultTopNAvg,
}

export const GameMetricsSchema = z
  .object({
    gameTopNAvg: TopNAvgSchema,
  })
  .default(defaultGameMetrics)

export const BaseGameSchema = z.object({
  _id: z.number(),
  city: CitySchema,
  series: SeriesSchema,
  pack: BasePackSchema,
  date: z.union([z.date(), z.string().transform((s) => new Date(s))]),
  price: z.number(),
  location: z.string(),
  address: z.string(),
  is_stream: z.boolean(),
})

export const GameSchema = BaseGameSchema.extend({
  metrics: GameMetricsSchema,
  pack: PackWithMetricsSchema,
})

export type BaseGame = z.infer<typeof BaseGameSchema>
export type Game = z.infer<typeof GameSchema>
export type GameMetrics = z.infer<typeof GameMetricsSchema>

export const GamesResponseSchema = z.object({
  data: z.array(GameSchema),
  nextCursor: z.number().nullable(),
})

export type GamesResponse = z.infer<typeof GamesResponseSchema>
