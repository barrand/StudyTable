import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { books, findBook } from "../lib/books";
const sha = "89ece29525e3c51d61850b28b4d4cf27ef9cd321";
const files: string[] = JSON.parse(
  await readFile(".cache/sources/step-files.json", "utf8"),
);
const lexicon: Record<
  string,
  { lemma: string; transliteration: string; gloss: string; range: string }
> = {};
const grammar: Record<string, string> = {};
const sources: unknown[] = [];
const plain = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const contents = new Map<string, string>();
for (const file of files) {
  const raw = await readFile(
    `.cache/sources/${file.split("/").at(-1)}`,
    "utf8",
  );
  if (!/CC BY 4\.0/.test(raw.slice(0, 6000)))
    throw new Error(`License not verified: ${file}`);
  contents.set(file, raw);
  sources.push({
    file,
    version: sha,
    url: `https://github.com/STEPBible/STEPBible-Data/blob/${sha}/${file.split("/").map(encodeURIComponent).join("/")}`,
    sha256: createHash("sha256").update(raw).digest("hex"),
    license: "CC BY 4.0",
    attribution:
      "STEP Bible (www.STEPBible.org), based on work at Tyndale House Cambridge",
    changes:
      "Selected lexical fields and word occurrences normalized into chapter JSON; HTML stripped; brief definitions and occurrence lists shortened for display. Original-language text is a study aid, not a reconstructed original for either English translation.",
  });
  if (file.startsWith("Lexicons/"))
    for (const line of raw.split("\n")) {
      const c = line.split("\t");
      if (!/^[GH]\d{4}/.test(c[0])) continue;
      const id = c[1]?.match(/[GH]\d{4}[A-Za-z]?/)?.[0];
      if (id && !lexicon[id])
        lexicon[id] = {
          lemma: c[3],
          transliteration: c[4],
          gloss: plain(c[6] ?? ""),
          range: plain(c[7] ?? "").slice(0, 1200),
        };
    }
  if (file.startsWith("Morphology codes/"))
    for (const line of raw.split("\n")) {
      const [code, ...rest] = line.split("\t");
      if (code && rest.length && code.length < 18)
        grammar[code] = plain(rest.filter(Boolean).join("; "));
    }
}
type Token = {
  id: string;
  form: string;
  gloss: string;
  grammar: string;
  language: string;
  variants: string;
};
const chapters: Record<string, Record<string, Token[]>> = {};
const occurrences: Record<string, string[]> = {};
for (const [file, raw] of contents) {
  if (!file.startsWith("Translators Amalgamated")) continue;
  const greek = file.includes("TAGNT");
  for (const line of raw.split("\n")) {
    const c = line.split("\t"),
      match = c[0].match(
        /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+).*#\d+[a-z]?=([^\s]+)/,
      );
    if (!match) continue;
    const aliases: Record<string, string> = {
      Sng: "SNG",
      Psa: "PSA",
      Eze: "EZK",
    };
    const book = findBook(aliases[match[1]] ?? match[1]);
    if (!book) continue;
    let chapter = Number(match[2]),
      verse = Number(match[3]);
    // Prefer explicitly recorded KJV versification for Greek words; Hebrew leading references are English.
    if (greek) {
      const kjv = c[0].match(/\[(?:(\d+)\.)?(\d+)\]/);
      if (kjv) {
        chapter = Number(kjv[1] ?? chapter);
        verse = Number(kjv[2]);
      }
    }
    if (chapter < 1 || chapter > book.chapters || verse < 1) continue;
    // Qere is represented separately: omit Ketiv-only forms, retain Leningrad/Qere alternatives with labels.
    if (!greek && match[4] === "K") continue;
    const key = `${book.slug}/${chapter}`,
      reference = `${book.slug}/${chapter}/${verse}`;
    const ids = greek
      ? [c[3]?.split("=")[0]]
      : (c[4]?.match(/[HA]\d{4}[A-Za-z]?/g) ?? []).filter(
          (id) => !/^H9/.test(id),
        );
    for (const id of ids) {
      if (!id || !lexicon[id]) continue;
      const code = greek ? c[3]?.split("=")[1] : c[5];
      const token: Token = {
        id,
        form: greek ? c[1].replace(/ \([^)]*\)$/, "") : c[1],
        gloss: plain(greek ? c[2] : c[3]),
        grammar: grammar[code] || code || "Not recorded",
        language: greek
          ? "Greek"
          : code?.startsWith("A")
            ? "Aramaic"
            : "Hebrew",
        variants: greek ? c[5] : match[4],
      };
      ((chapters[key] ??= {})[verse] ??= []).push(token);
      const refs = (occurrences[id] ??= []);
      if (refs.length < 10 && !refs.includes(reference)) refs.push(reference);
    }
  }
}
for (const [key, verses] of Object.entries(chapters)) {
  await mkdir(`data/words/${key.split("/")[0]}`, { recursive: true });
  await writeFile(`data/words/${key}.json`, JSON.stringify(verses));
}
await writeFile("data/words/lexicon.json", JSON.stringify(lexicon));
await writeFile("data/words/occurrences.json", JSON.stringify(occurrences));
const manifest = JSON.parse(await readFile("data/sources.json", "utf8"));
manifest.STEPBible = {
  version: sha,
  importedAt: manifest.STEPBible?.importedAt ?? new Date().toISOString(),
  sources,
};
await writeFile("data/sources.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `STEPBible: ${Object.keys(chapters).length} chapters, ${Object.keys(lexicon).length} brief entries. ${books.length} canonical books supported.`,
);
