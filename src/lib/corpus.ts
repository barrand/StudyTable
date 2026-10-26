import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findBook, parseReference, type Reference, type Translation } from './books';
import type { Chapter } from './usfm';

const chapters = new Map<string, Promise<Chapter>>();
export function loadChapter(ref: Reference, translation: Translation): Promise<Chapter> {
  const book = findBook(ref.book);
  if (!book || !Number.isInteger(ref.chapter) || ref.chapter < 1 || ref.chapter > book.chapters || !['KJV','WEB'].includes(translation)) throw new Error('Invalid chapter reference');
  const key = `${translation}/${book.id}/${ref.chapter}`;
  if (!chapters.has(key)) chapters.set(key, readFile(join(process.cwd(), 'data', 'chapters', key + '.json'), 'utf8').then(JSON.parse).catch(error => { chapters.delete(key); throw error; }));
  return chapters.get(key)!;
}
export async function resolveReference(value: string, translation: Translation): Promise<Reference | null> {
  const ref = parseReference(value); if (!ref) return null;
  const chapter = await loadChapter(ref, translation);
  return ref.verse === undefined || chapter.verses.some(v => v.number <= ref.verse! && (v.endVerse ?? v.number) >= ref.verse!) ? ref : null;
}
export type SearchRow = [string, number, number, string];
const indexes = new Map<Translation, Promise<SearchRow[]>>();
export async function searchCorpus(query: string, translation: Translation, limit = 50) {
  const q = query.trim(); if (!q || q.length > 200) return { results: [], total: 0 };
  const direct = await resolveReference(q, translation);
  if (direct) return { reference: direct, results: [], total: 1 };
  // A reference-shaped query must not accidentally become a phrase search.
  if (/\d+\s*:\s*\d+/.test(q)) return { results: [], total: 0 };
  if (!indexes.has(translation)) indexes.set(translation, readFile(join(process.cwd(), 'data', 'search', `${translation}.json`), 'utf8').then(JSON.parse));
  const rows = await indexes.get(translation)!; const phrase = q.replace(/^"(.*)"$/, '$1').toLocaleLowerCase('en');
  if(!phrase)return {results:[],total:0};
  const isWord=(character:string|undefined)=>character!==undefined&&/[\p{L}\p{N}]/u.test(character);
  const matching = rows.filter(row => {
    const text=row[3].toLocaleLowerCase('en');let index=text.indexOf(phrase);
    while(index>=0){if((!isWord(phrase[0])||!isWord(text[index-1]))&&(!isWord(phrase.at(-1))||!isWord(text[index+phrase.length])))return true;index=text.indexOf(phrase,index+1);}
    return false;
  });
  return { results: matching.slice(0, limit), total: matching.length };
}
