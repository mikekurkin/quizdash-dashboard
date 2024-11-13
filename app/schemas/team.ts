import { z } from 'zod'
import { CitySchema } from './city'

export const TeamSchema = z.object({
  _id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  city: CitySchema.nullable(),
  previous_team_id: z.string().uuid().nullish(),
  inconsistent_rank: z.boolean(),
})

export const TeamsResponseSchema = z.object({
  data: z.array(TeamSchema),
  nextCursor: z.string().nullish(),
})

export type Team = z.infer<typeof TeamSchema>
export type TeamsResponse = z.infer<typeof TeamsResponseSchema>
