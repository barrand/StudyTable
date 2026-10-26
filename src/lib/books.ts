export const BOOKS = [
  ['GEN','Genesis',50],['EXO','Exodus',40],['LEV','Leviticus',27],['NUM','Numbers',36],['DEU','Deuteronomy',34],
  ['JOS','Joshua',24],['JDG','Judges',21],['RUT','Ruth',4],['1SA','1 Samuel',31],['2SA','2 Samuel',24],
  ['1KI','1 Kings',22],['2KI','2 Kings',25],['1CH','1 Chronicles',29],['2CH','2 Chronicles',36],['EZR','Ezra',10],
  ['NEH','Nehemiah',13],['EST','Esther',10],['JOB','Job',42],['PSA','Psalms',150],['PRO','Proverbs',31],
  ['ECC','Ecclesiastes',12],['SNG','Song of Solomon',8],['ISA','Isaiah',66],['JER','Jeremiah',52],['LAM','Lamentations',5],
  ['EZK','Ezekiel',48],['DAN','Daniel',12],['HOS','Hosea',14],['JOL','Joel',3],['AMO','Amos',9],['OBA','Obadiah',1],
  ['JON','Jonah',4],['MIC','Micah',7],['NAM','Nahum',3],['HAB','Habakkuk',3],['ZEP','Zephaniah',3],['HAG','Haggai',2],
  ['ZEC','Zechariah',14],['MAL','Malachi',4],['MAT','Matthew',28],['MRK','Mark',16],['LUK','Luke',24],['JHN','John',21],
  ['ACT','Acts',28],['ROM','Romans',16],['1CO','1 Corinthians',16],['2CO','2 Corinthians',13],['GAL','Galatians',6],
  ['EPH','Ephesians',6],['PHP','Philippians',4],['COL','Colossians',4],['1TH','1 Thessalonians',5],['2TH','2 Thessalonians',3],
  ['1TI','1 Timothy',6],['2TI','2 Timothy',4],['TIT','Titus',3],['PHM','Philemon',1],['HEB','Hebrews',13],
  ['JAS','James',5],['1PE','1 Peter',5],['2PE','2 Peter',3],['1JN','1 John',5],['2JN','2 John',1],['3JN','3 John',1],
  ['JUD','Jude',1],['REV','Revelation',22]
] as const;

export const books = BOOKS.map(([id, name, chapters], index) => ({
  id, name, chapters, slug: name.toLowerCase().replaceAll(' ', '-'),
  testament: index < 39 ? 'Old Testament' : 'New Testament',
  bibleHub: name === 'Song of Solomon' ? 'songs' : name.toLowerCase().replaceAll(' ', '_')
}));
export type Book = typeof books[number];
export function findBook(value: string): Book | undefined {
  const key = value.toLowerCase().replace(/[.\s_-]/g, '');
  return books.find(b => [b.id, b.name, b.slug].some(v => v.toLowerCase().replace(/[.\s_-]/g, '') === key))
    ?? (key === 'psalm' || key === 'ps' ? books[18] : key === 'songofsongs' ? books[21] : undefined);
}
export type Translation = 'KJV' | 'WEB';
export const TRANSLATIONS: Record<Translation, { name: string; edition: string; attribution: string }> = {
  KJV: { name: 'King James Version', edition: 'eBible.org standardized 1769 text', attribution: 'Public domain in the United States. Text courtesy of CrossWire Bible Society and eBible.org.' },
  WEB: { name: 'World English Bible', edition: 'WEBP, 2020 stable text edition', attribution: 'Public domain. “World English Bible” is a trademark of eBible.org. Text is reproduced without alteration.' }
};
export interface Reference { book: string; chapter: number; verse?: number }
export function referenceLabel(ref: Reference): string {
  return `${findBook(ref.book)?.name ?? ref.book} ${ref.chapter}${ref.verse === undefined ? '' : ':' + ref.verse}`;
}
export function readerUrl(ref: Reference, translation?: Translation): string {
  const book = findBook(ref.book);
  if (!book) throw new Error('Unknown book');
  const params = new URLSearchParams();
  if (ref.verse !== undefined) params.set('verse', String(ref.verse));
  if (translation) params.set('translation', translation);
  return `/bible/${book.slug}/${ref.chapter}${params.size ? '?' + params : ''}`;
}
export function parseReference(input: string): Reference | null {
  const match = input.trim().match(/^(.+?)\s+(\d{1,3})(?::(\d{1,3}))?$/);
  if (!match) return null;
  const book = findBook(match[1]); const chapter = Number(match[2]);
  const verse = match[3] ? Number(match[3]) : undefined;
  if (!book || chapter < 1 || chapter > book.chapters || verse === 0) return null;
  return { book: book.id, chapter, ...(verse !== undefined ? { verse } : {}) };
}
