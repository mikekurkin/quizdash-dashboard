import { z } from 'zod'
import { BaseGameSchema, GameSchema } from './game'
import { RankSchema } from './rank'
import { TeamSchema } from './team'

export const defaultGameResultMetrics = {
  pack_place: 0,
  game_efficiency: 0,
  pack_efficiency: 0,
}

export const GameResultMetricsSchema = z
  .object({
    pack_place: z.number().default(defaultGameResultMetrics.pack_place),
    game_efficiency: z.number().default(defaultGameResultMetrics.game_efficiency),
    pack_efficiency: z.number().default(defaultGameResultMetrics.pack_efficiency),
  })
  .default(defaultGameResultMetrics)

export const BaseGameResultSchema = z.object({
  _id: z.string(),
  game: BaseGameSchema.extend({
    address: z.string().optional(),
  }),
  team: TeamSchema,
  rounds: z.array(z.number()),
  sum: z.number(),
  place: z.number(),
  rank: RankSchema.nullable(),
  has_errors: z.boolean(),
})

export const MinimalGameResultSchema = z.object({
  _id: z.string(),
  game_id: z.string(),
  game_date: z.union([z.date(), z.string().transform((s) => new Date(s))]),
  game_series_id: z.string().uuid(),
  pack_formatted: z.string(),
  rounds: z.array(z.number()),
  sum: z.number(),
  place: z.number(),
  rank: RankSchema.nullable(),
  has_errors: z.boolean(),
})

export const GameResultSchema = BaseGameResultSchema.extend({
  metrics: GameResultMetricsSchema,
  game: GameSchema.extend({
    address: z.string().optional(),
  }),
})

export type BaseGameResult = z.infer<typeof BaseGameResultSchema>
export type GameResult = z.infer<typeof GameResultSchema>
export type GameResultMetrics = z.infer<typeof GameResultMetricsSchema>
export type MinimalGameResult = z.infer<typeof MinimalGameResultSchema>

export const GameResultsResponseSchema = z.object({
  data: z.array(GameResultSchema),
  nextCursor: z.number().nullish(),
})

export type GameResultsResponse = z.infer<typeof GameResultsResponseSchema>
