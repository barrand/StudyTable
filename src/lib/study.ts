import { z } from 'zod';

export const ActionSchema = z.enum(['chapter-overview', 'context', 'related', 'word-study', 'ask']);
export type StudyAction = z.infer<typeof ActionSchema>;
export const StudyRequestSchema = z.object({
  reference: z.string().min(3).max(80), translation: z.enum(['KJV','WEB']), action: ActionSchema,
  question: z.string().trim().min(1).max(500).optional(),
  conversationToken: z.string().max(16000).optional()
}).strict().superRefine((value, ctx) => {
  if ((value.action === 'ask') !== (value.question !== undefined)) ctx.addIssue({code:'custom',message:'A question is required only for ask.'});
  if(value.action!=='ask'&&value.conversationToken!==undefined)ctx.addIssue({code:'custom',message:'Conversation context is allowed only for ask.'});
});
export type StudyRequest = z.infer<typeof StudyRequestSchema>;
const prose = z.string().trim().min(1).max(2500);
export const StudyResultSchema = z.object({
  observations: z.array(prose).max(8), interpretations: z.array(prose).max(6),
  relatedReferences: z.array(z.object({ reference: z.string().max(80), explanation: prose }).strict()).max(8),
  cautions: z.array(prose).max(6),
  summary: prose.optional(), bookContext: prose.optional(), authorshipAndAudience: prose.optional(), historicalSettingAndPeople: prose.optional(),
  terms: z.array(z.object({ id: z.string().max(40), contextualMeaning: prose, lexicalRange: prose }).strict()).min(1).max(3).optional()
}).strict();
export type StudyResult = z.infer<typeof StudyResultSchema>;
export interface WordTerm { id: string; form: string; lemma: string; transliteration: string; gloss: string; grammar: string; language: string; edition: string; occurrences: string[]; attestedGlosses?: string[]; dictionaryGloss?: string }
export interface StudyAnswer { result: StudyResult; reference: string; translation: 'KJV'|'WEB'; action: StudyAction; cached: boolean; generatedAt: string; model: string; cacheVersion: string; remaining?: number; terms?: WordTerm[]; conversationToken?: string }
