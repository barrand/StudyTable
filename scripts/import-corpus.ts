import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
import { books, type Verse } from "../lib/books";
export function cleanUsfm(value: string) {
  return value
    .replace(/\\(f|fe|x)\s[\s\S]*?\\\1\*/g, "")
    .replace(/\\\+?w\s+([^|]*?)\|[^]*?\\\+?w\*/g, "$1")
    .replace(/\\(?:s\d*|ms\d*|r|d|sp|cl|cd|qa)\s[^\n]*/g, "")
    .replace(/\\(?:fig)\s[\s\S]*?\\fig\*/g, "")
    .replace(/\\[+a-z][a-z0-9-]*\*?\s?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
export async function importCorpus() {
  await mkdir("data/corpus", { recursive: true });
  const manifestPath = "data/sources.json";
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {}
  for (const [translation, id, edition] of [
    [
      "WEB",
      "engwebp",
      "World English Bible, WEBP American English, 2020 stable text edition (current eBible distribution)",
    ],
    [
      "KJV",
      "eng-kjv",
      "King James Version, standardized 1769 text; 66-book selection",
    ],
  ] as const) {
    const buffer = await readFile(`.cache/sources/${id}.zip`);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const previous = manifest[translation] as { sha256?: string } | undefined;
    if (
      previous?.sha256 &&
      previous.sha256 !== checksum &&
      !process.argv.includes("--accept-source-update")
    )
      throw new Error(
        `${translation} source changed. Review and pass --accept-source-update deliberately.`,
      );
    const archive = unzipSync(buffer);
    const index: {
      book: string;
      chapter: number;
      verse: number;
      text: string;
    }[] = [];
    for (const book of books) {
      const entry = Object.values(archive).find((v) =>
        new RegExp(`^\\\\id ${book.code}\\b`).test(strFromU8(v)),
      );
      if (!entry) throw new Error(`Missing ${book.code}`);
      const source = strFromU8(entry);
      const chapters = source.split(/\\c\s+(\d+)\s*/).slice(1);
      if (chapters.length / 2 !== book.chapters)
        throw new Error(`${book.code}: chapter count mismatch`);
      for (let c = 0; c < chapters.length; c += 2) {
        const chapter = Number(chapters[c]);
        const verses: Verse[] = [];
        const parts = chapters[c + 1]
          .split(/\\v\s+(\d+(?:[-–]\d+)?[a-z]?)\s*/)
          .slice(1);
        for (let v = 0; v < parts.length; v += 2) {
          const label = parts[v],
            number = parseInt(label, 10),
            text = cleanUsfm(parts[v + 1]);
          if (!number || /\\|strong=/.test(text))
            throw new Error(`Malformed ${book.code} ${chapter}:${label}`);
          if (verses.some((v) => v.number === number))
            throw new Error(`Duplicate ${book.code} ${chapter}:${number}`);
          verses.push({ number, label, text });
          index.push({ book: book.slug, chapter, verse: number, text });
        }
        if (!verses.length) throw new Error(`Empty ${book.code} ${chapter}`);
        await mkdir(`data/corpus/${translation}/${book.slug}`, {
          recursive: true,
        });
        await writeFile(
          `data/corpus/${translation}/${book.slug}/${chapter}.json`,
          JSON.stringify(verses),
        );
      }
    }
    await writeFile(
      `data/corpus/${translation}-search.json`,
      JSON.stringify(index),
    );
    manifest[translation] = {
      edition,
      url: `https://ebible.org/Scriptures/${id}_usfm.zip`,
      rightsUrl: `https://ebible.org/${id}/copyright.htm`,
      sha256: checksum,
      importedAt:
        (previous as { importedAt?: string })?.importedAt ??
        new Date().toISOString(),
      license: "Public Domain (KJV: UK Crown rights apply)",
      attribution:
        translation === "WEB"
          ? "World English Bible · eBible.org. World English Bible is a trademark of eBible.org."
          : "King James Version · CrossWire Bible Society and eBible.org.",
      changes:
        "USFM formatting, notes, headings, and tags removed; scripture wording preserved. Restricted to 66 canonical books.",
      books: 66,
      chapters: 1189,
      verses: index.length,
    };
    console.log(
      `${translation}: ${index.length} verses / 1189 chapters imported`,
    );
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
if (process.argv[1]?.endsWith("import-corpus.ts")) await importCorpus();
