import { z } from 'zod'
import { GameMetricsSchema } from './game'
import { GameResultMetricsSchema } from './gameResult'
import { PackMetricsSchema } from './pack'

export const derivedData = z.object({
  results: z.record(z.string(), GameResultMetricsSchema),
  games: z.record(z.number(), GameMetricsSchema),
  packs: z.record(z.string(), PackMetricsSchema),
  teams: z.record(z.string(), z.object({})),
})

export type DerivedData = z.infer<typeof derivedData>
export type DerivedDataMap<K extends keyof DerivedData> = DerivedData[K]
