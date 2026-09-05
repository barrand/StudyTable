import { NextResponse } from "next/server";
import { authorized, sameOrigin } from "@/lib/server-auth";
import { studyInput } from "@/lib/study-schema";
import { getChapter, getVerse } from "@/lib/corpus";
import { getTerms } from "@/lib/words";
import { generateStudy } from "@/lib/gemini";
import { reserveQuota, LimitError } from "@/lib/quota";
export const runtime = "nodejs";
export const maxDuration = 45;
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!(await authorized()))
    return reply({ error: "Enter the shared password to continue." }, 401);
  if (!sameOrigin(request))
    return reply({ error: "Request origin not allowed." }, 403);
  let parsed;
  try {
    const text = await request.text();
    if (text.length > 4096) return reply({ error: "Request too large." }, 413);
    parsed = studyInput.safeParse(JSON.parse(text));
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (!parsed.success)
    return reply(
      {
        error:
          "Choose one verse and a supported study action. Questions may be up to 500 characters.",
      },
      400,
    );
  const { reference, translation, action, question } = parsed.data;
  const verse = getVerse(reference, translation);
  if (!verse?.text)
    return reply(
      { error: "That verse is not available in this translation." },
      400,
    );
  if (!process.env.GEMINI_API_KEY)
    return reply(
      {
        error:
          "AI study is not connected yet. You can continue reading and comparing translations.",
      },
      503,
    );
  try {
    const terms =
      action === "word-study" ? getTerms(reference, translation) : [];
    const remaining = await reserveQuota(request);
    const immediateContext = getChapter(
      reference.book,
      reference.chapter,
      translation,
    ).filter((v) => Math.abs(v.number - reference.verse) <= 3);
    const answer = await generateStudy({
      reference,
      translation,
      action,
      question,
      verse,
      immediateContext,
      terms,
    });
    const valid = answer.relatedReferences.filter(
      (item) => !!getVerse(item.reference, translation)?.text,
    );
    const cautions = [...answer.cautions];
    if (valid.length !== answer.relatedReferences.length)
      cautions.push(
        "Some suggested references could not be verified and were omitted.",
      );
    // Reject quoted prose instead of accidentally presenting model-authored scripture as quotation.
    if (
      [
        ...answer.observations,
        ...answer.interpretations,
        ...answer.cautions,
        ...valid.map((v) => v.reason),
      ].some((s) => /[“”"<>]|https?:\/\//.test(s))
    )
      return reply(
        {
          error:
            "The answer could not be verified. Please try another study action.",
          remaining,
        },
        502,
      );
    return reply({
      ...answer,
      cautions,
      relatedReferences: valid.map((item) => ({
        ...item,
        text: getVerse(item.reference, translation)!.text,
      })),
      reference,
      translation,
      terms,
      remaining,
    });
  } catch (error) {
    return reply(
      {
        error:
          error instanceof LimitError
            ? error.message
            : "Study help is temporarily unavailable. Your reading place is unchanged.",
      },
      error instanceof LimitError ? 429 : 503,
    );
  }
}
