import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { findBook, type Reference, type Translation } from "./books";
import { getVerse } from "./corpus";
export type StudyTerm = {
  id: string;
  lemma: string;
  form: string;
  transliteration: string;
  gloss: string;
  range: string;
  grammar: string;
  language: string;
  edition: string;
  occurrences: Reference[];
};
type Lex = Pick<StudyTerm, "lemma" | "transliteration" | "gloss" | "range">;
let lex: Record<string, Lex> | undefined,
  occ: Record<string, string[]> | undefined;
export function getTerms(
  ref: Reference,
  translation: Translation,
): StudyTerm[] {
  const book = findBook(ref.book);
  if (!book || !getVerse(ref, translation)) return [];
  const file = path.join(
    process.cwd(),
    "data/words",
    book.slug,
    `${ref.chapter}.json`,
  );
  if (!existsSync(file)) return [];
  lex ??= JSON.parse(readFileSync("data/words/lexicon.json", "utf8"));
  occ ??= JSON.parse(readFileSync("data/words/occurrences.json", "utf8"));
  const rows = JSON.parse(readFileSync(file, "utf8"))[ref.verse] as
    | (Pick<StudyTerm, "id" | "form" | "gloss" | "grammar" | "language"> & {
        variants: string;
      })[]
    | undefined;
  const seen = new Set<string>();
  return (rows ?? [])
    .filter((t) => {
      if (seen.has(t.id) || !lex![t.id]) return false;
      if (
        t.language === "Greek" &&
        !t.variants.includes(translation === "KJV" ? "TR" : "Byz")
      )
        return false;
      seen.add(t.id);
      return true;
    })
    .sort(
      (a, b) =>
        Number(/Noun|Verb|Adjective|N-|V-|A-|HN|HV/.test(b.grammar)) -
        Number(/Noun|Verb|Adjective|N-|V-|A-|HN|HV/.test(a.grammar)),
    )
    .slice(0, 3)
    .map((t) => ({
      ...lex![t.id],
      ...t,
      edition:
        t.language === "Greek"
          ? `STEPBible TAGNT · ${translation === "KJV" ? "Scrivener 1894 TR" : "Byzantine (RP 2005)"} witness; study text, not an exact translation alignment`
          : "STEPBible TAHOT · Leningrad-based Hebrew/Aramaic, English versification; L/Q readings",
      occurrences: (occ![t.id] ?? [])
        .map((s) => {
          const [book, chapter, verse] = s.split("/");
          return {
            work: "bible" as const,
            book,
            chapter: +chapter,
            verse: +verse,
          };
        })
        .filter((r) => !!getVerse(r, translation))
        .slice(0, 5),
    }));
}
