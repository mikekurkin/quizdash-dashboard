import { z } from 'zod'
import { GameSchema } from './game'
import { RankSchema } from './rank'
import { TeamSchema } from './team'

export const GameResultSchema = z.object({
  _id: z.string(),
  game: GameSchema,
  team: TeamSchema,
  rounds: z.array(z.number()),
  sum: z.number(),
  place: z.number(),
  rank: RankSchema.nullish(),
  has_errors: z.boolean(),
})

export type GameResult = z.infer<typeof GameResultSchema>
