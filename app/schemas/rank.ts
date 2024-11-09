import { z } from 'zod';

export const RankSchema = z.object({
  _id: z.string(),
  name: z.string(),
});

export type Rank = z.infer<typeof RankSchema>;
