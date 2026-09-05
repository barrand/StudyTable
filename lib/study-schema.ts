import { z } from "zod";
export const referenceSchema = z
  .object({
    work: z.literal("bible"),
    book: z
      .string()
      .max(40)
      .regex(/^[a-z0-9-]+$/),
    chapter: z.number().int().positive().max(150),
    verse: z.number().int().positive().max(176),
  })
  .strict();
export const studyInput = z
  .object({
    reference: referenceSchema,
    translation: z.enum(["WEB", "KJV"]),
    action: z.enum(["context", "related", "word-study", "ask"]),
    question: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.action === "ask") !== !!value.question)
      ctx.addIssue({
        code: "custom",
        message: "A question is required only for Ask.",
      });
  });
export const studyOutput = z
  .object({
    observations: z.array(z.string().max(1600)).max(6),
    interpretations: z.array(z.string().max(1600)).max(6),
    relatedReferences: z
      .array(
        z
          .object({ reference: referenceSchema, reason: z.string().max(500) })
          .strict(),
      )
      .max(8),
    cautions: z.array(z.string().max(700)).max(5),
  })
  .strict();
export type StudyOutput = z.infer<typeof studyOutput>;
export const outputJsonSchema = {
  type: "object",
  properties: {
    observations: { type: "array", items: { type: "string" } },
    interpretations: { type: "array", items: { type: "string" } },
    relatedReferences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reference: {
            type: "object",
            properties: {
              work: { type: "string", enum: ["bible"] },
              book: { type: "string" },
              chapter: { type: "integer" },
              verse: { type: "integer" },
            },
            required: ["work", "book", "chapter", "verse"],
          },
          reason: { type: "string" },
        },
        required: ["reference", "reason"],
      },
    },
    cautions: { type: "array", items: { type: "string" } },
  },
  required: [
    "observations",
    "interpretations",
    "relatedReferences",
    "cautions",
  ],
};
