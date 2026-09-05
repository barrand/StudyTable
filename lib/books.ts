const names =
  "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation".split(
    "|",
  );
const codes =
  "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split(
    " ",
  );
const counts = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150,
  31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16,
  24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1,
  22,
];
export const books = names.map((name, index) => ({
  name,
  code: codes[index],
  slug: name.toLowerCase().replaceAll(" ", "-"),
  chapters: counts[index],
  testament: index < 39 ? "Old Testament" : "New Testament",
}));
export type Book = (typeof books)[number];
export type Translation = "WEB" | "KJV";
export type Reference = {
  work: "bible";
  book: string;
  chapter: number;
  verse: number;
};
export type Verse = { number: number; text: string; label: string };
export const findBook = (value: string) =>
  books.find((b) =>
    [b.slug, b.name.toLowerCase(), b.code.toLowerCase()].includes(
      value.toLowerCase(),
    ),
  );
export function referenceLabel(ref: Reference) {
  return `${findBook(ref.book)?.name ?? ref.book} ${ref.chapter}:${ref.verse}`;
}
export function referenceUrl(ref: Reference, translation?: Translation) {
  return `/bible/${ref.book}/${ref.chapter}?verse=${ref.verse}${translation ? `&translation=${translation}` : ""}`;
}
export function bibleHubUrl(ref: Reference) {
  const book = findBook(ref.book);
  const slug =
    book?.name === "Song of Solomon"
      ? "songs"
      : (book?.name ?? ref.book).toLowerCase().replaceAll(" ", "_");
  return `https://biblehub.com/${slug}/${ref.chapter}-${ref.verse}.htm`;
}
export function parseReference(value: string): Reference | null {
  const match = value.trim().match(/^(.+?)\s+(\d{1,3})(?::(\d{1,3}))?$/);
  if (!match) return null;
  const aliases: Record<string, string> = {
    ps: "psalms",
    psalm: "psalms",
    mt: "matthew",
    matt: "matthew",
    mk: "mark",
    lk: "luke",
    jn: "john",
    gen: "genesis",
    ex: "exodus",
    song: "song-of-solomon",
    "song of songs": "song-of-solomon",
    "1 cor": "1-corinthians",
    "2 cor": "2-corinthians",
    rev: "revelation",
  };
  const key = match[1].toLowerCase().replace(/\.$/, "");
  const book = findBook(aliases[key] ?? key);
  const chapter = Number(match[2]),
    verse = Number(match[3] ?? 1);
  return book && chapter > 0 && chapter <= book.chapters && verse > 0
    ? { work: "bible", book: book.slug, chapter, verse }
    : null;
}
