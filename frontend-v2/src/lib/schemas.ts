import { z } from 'zod';

export const BibleVerseSchema = z.object({
  verse: z.number(),
  text: z.string(),
  strongs: z.string().optional(),
});

export const BibleChapterSchema = z.array(BibleVerseSchema);

export const InterlinearWordSchema = z.object({
  original: z.string(),
  translit: z.string(),
  root: z.string().optional(),
  translations: z.array(z.string()).optional(),
  morphology: z.string().optional(),
  strong: z.string().optional(),
});

export const InterlinearChapterSchema = z.record(
  z.string().or(z.number()),
  z.array(InterlinearWordSchema)
);

export type BibleVerseType = z.infer<typeof BibleVerseSchema>;
export type InterlinearWordType = z.infer<typeof InterlinearWordSchema>;
