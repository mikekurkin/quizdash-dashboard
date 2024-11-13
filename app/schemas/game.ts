import { z } from 'zod'
import { CitySchema } from './city'
import { SeriesSchema } from './series'

export const GameSchema = z.object({
  _id: z.number(),
  city: CitySchema,
  series: SeriesSchema,
  pack: z.object({
    number: z.string(),
    replay_number: z.number(),
    formatted: z.string(),
  }),
  date: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  price: z.number(),
  location: z.string(),
  address: z.string().optional(),
  is_stream: z.boolean(),
})

export const GamesResponseSchema = z.object({
  data: z.array(GameSchema),
  nextCursor: z.number().nullish(),
})

export type Game = z.infer<typeof GameSchema>
export type GamesResponse = z.infer<typeof GamesResponseSchema>
