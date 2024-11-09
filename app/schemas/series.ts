import { z } from 'zod';

export const SeriesSchema = z.object({
  _id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export type Series = z.infer<typeof SeriesSchema>;
