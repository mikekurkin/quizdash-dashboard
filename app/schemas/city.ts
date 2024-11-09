import { z } from 'zod';

export const CitySchema = z.object({
  _id: z.number(),
  name: z.string(),
  slug: z.string(),
  timezone: z.string(),
});

export type City = z.infer<typeof CitySchema>;
