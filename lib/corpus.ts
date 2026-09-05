import { readFileSync } from "node:fs";
import path from "node:path";
import {
  books,
  findBook,
  type Reference,
  type Translation,
  type Verse,
} from "./books";
const chapterCache = new Map<string, Verse[]>();
export function getChapter(
  book: string,
  chapter: number,
  translation: Translation,
): Verse[] {
  const found = findBook(book);
  if (
    !found ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > found.chapters ||
    !["WEB", "KJV"].includes(translation)
  )
    return [];
  const key = `${translation}/${found.slug}/${chapter}`;
  if (!chapterCache.has(key))
    chapterCache.set(
      key,
      JSON.parse(
        readFileSync(
          path.join(process.cwd(), "data/corpus", `${key}.json`),
          "utf8",
        ),
      ),
    );
  return chapterCache.get(key)!;
}
export function getVerse(ref: Reference, translation: Translation) {
  return getChapter(ref.book, ref.chapter, translation).find(
    (v) => v.number === ref.verse,
  );
}
export type SearchResult = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};
const searchCache = new Map<Translation, SearchResult[]>();
export function searchCorpus(
  query: string,
  translation: Translation,
  offset = 0,
): { results: SearchResult[]; total: number } {
  if (!searchCache.has(translation))
    searchCache.set(
      translation,
      JSON.parse(
        readFileSync(
          path.join(process.cwd(), "data/corpus", `${translation}-search.json`),
          "utf8",
        ),
      ),
    );
  const needle = query
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replaceAll("’", "'")
    .replace(/\s+/g, " ")
    .trim();
  if (needle.length < 2) return { results: [], total: 0 };
  const escape = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(
    `(?<![\\p{L}\\p{N}])${escape}(?![\\p{L}\\p{N}])`,
    "u",
  );
  const hits = searchCache
    .get(translation)!
    .filter((v) =>
      expression.test(
        v.text.normalize("NFKC").toLocaleLowerCase().replaceAll("’", "'"),
      ),
    );
  return { results: hits.slice(offset, offset + 30), total: hits.length };
}
export function adjacentChapter(
  book: string,
  chapter: number,
  direction: -1 | 1,
) {
  const index = books.findIndex((b) => b.slug === book),
    current = books[index];
  const next = chapter + direction;
  if (next >= 1 && next <= current.chapters) return `/bible/${book}/${next}`;
  const other = books[index + direction];
  return other
    ? `/bible/${other.slug}/${direction === 1 ? 1 : other.chapters}`
    : null;
}
