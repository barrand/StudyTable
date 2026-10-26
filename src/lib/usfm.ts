export interface Verse { number: number; text: string; endVerse?: number; omitted?: true }
export interface Chapter { book: string; chapter: number; verses: Verse[] }

/** Retain verse words, but never headings, editorial notes, or USFM attributes. */
export function parseUsfm(source: string): Chapter[] {
  const id = source.match(/\\id\s+(\w+)/)?.[1];
  if (!id) throw new Error('USFM is missing its book identifier');
  const clean = source.replace(/\\(f|fe|x)\s[\s\S]*?\\\1\*/g, '')
    .replace(/\\\+?w\s+([^|\\]+)(?:\|[^\\]*)?\\\+?w\*/g, '$1')
    .replace(/\\fig\s[\s\S]*?\\fig\*/g, '');
  const chapters: Chapter[] = []; let chapter: Chapter | undefined; let verse: Verse | undefined;
  const chunks = clean.split(/(\\\+?[a-z][a-z0-9]*\*?)/gi);
  const inline = /^(?:\+?(?:add|nd|wj|it|bd|bdit|em|sc|sup|qt|qs|qac|k|bk|sig|tl|pn|ord|dc)|p|m|q\d?|pi\d?|li\d?|nb|b|mi|pc|cls)\*?$/;
  for (let i = 1; i < chunks.length; i += 2) {
    const marker = chunks[i].slice(1); let text = chunks[i + 1] ?? '';
    if (marker === 'c') {
      const number = Number(text.trim().split(/\s/)[0]);
      if (!Number.isInteger(number) || number < 1) throw new Error('Invalid chapter');
      chapter = { book: id, chapter: number, verses: [] }; chapters.push(chapter); verse = undefined;
    } else if (marker === 'v') {
      if (!chapter) throw new Error('Verse before chapter');
      const match = text.match(/^\s*(\d+)(?:-(\d+))?\s+([\s\S]*)$/);
      if (!match) throw new Error('Unsupported verse identifier');
      verse = { number: Number(match[1]), text: match[3], ...(match[2] ? { endVerse: Number(match[2]) } : {}) };
      if (chapter.verses.some(v => v.number === verse!.number)) throw new Error('Duplicate verse identifier');
      chapter.verses.push(verse);
    } else if (verse && inline.test(marker)) {
      // Closing character styles may directly precede punctuation: do not insert spaces.
      verse.text += (/^(?:p|m|q\d?|qs|pi\d?|li\d?|nb|b|mi|pc|cls)$/.test(marker)?' ':'') + text;
    } else if (!inline.test(marker)) {
      if(verse&&text.trim()&&!/^(?:s\d?|ms\d?|d|r|sp|cl|cp|rem)$/.test(marker))throw new Error(`Unsupported marker inside verse: ${marker}`);
      verse = undefined;
    }
  }
  for (const c of chapters) for (const v of c.verses) {
    v.text = v.text.replace(/\|[^\s]+/g, '').replace(/\s+/g, ' ').trim();
    if (!v.text) v.omitted = true;
  }
  return chapters;
}
