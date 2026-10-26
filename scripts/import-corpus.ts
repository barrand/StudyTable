import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { books, TRANSLATIONS, type Translation } from '../src/lib/books';
import { parseUsfm, type Chapter } from '../src/lib/usfm';

const root = process.cwd();
const lockPath = join(root, 'data', 'source-lock.json');
const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const specifications = [
  { translation: 'KJV' as Translation, url: 'https://ebible.org/Scriptures/eng-kjv_usfm.zip', source: 'https://ebible.org/find/details.php?id=eng-kjv' },
  { translation: 'WEB' as Translation, url: 'https://ebible.org/Scriptures/engwebp_usfm.zip', source: 'https://ebible.org/find/details.php?id=engwebp' }
];
type Source = typeof specifications[number] & { sha256: string; importedAt: string; edition: string; license: string; attribution: string; books: number; chapters: number; verses: number };
type Manifest = { formatVersion: number; sources: Source[]; files: Record<string, string> };

async function main() {
  const update = process.argv.includes('--update-lock'); const verify = process.argv.includes('--verify');
  let previous: Manifest | undefined;
  try { previous = JSON.parse(await readFile(lockPath, 'utf8')); } catch { if (!update) throw new Error('Source manifest missing. Bootstrap with --update-lock after reviewing source editions.'); }
  if (verify) {
    if (!previous || Object.keys(previous.files).length < 2380) throw new Error('Incomplete corpus manifest');
    for (const [path, digest] of Object.entries(previous.files)) {
      if (hash(await readFile(join(root, path))) !== digest) throw new Error(`Generated data checksum mismatch: ${path}`);
    }
    for (const source of previous.sources) {
      if (source.books !== 66 || source.chapters !== 1189 || source.verses < 31000) throw new Error(`Incomplete ${source.translation} corpus`);
      for (const book of books) for (let c = 1; c <= book.chapters; c++) {
        const chapter: Chapter = JSON.parse(await readFile(join(root, 'data', 'chapters', source.translation, book.id, `${c}.json`), 'utf8'));
        if (chapter.book !== book.id || chapter.chapter !== c || !chapter.verses.length) throw new Error('Invalid canonical chapter');
        const identifiers = chapter.verses.map(v => v.number);
        if (new Set(identifiers).size !== identifiers.length || identifiers.some((v,i) => i > 0 && v <= identifiers[i-1])) throw new Error('Invalid verse order');
      }
    }
    console.log(`Verified ${previous.sources.length} translations and ${Object.keys(previous.files).length} generated files offline.`); return;
  }
  const manifest: Manifest = { formatVersion: 1, sources: [], files: {} };
  for (const spec of specifications) {
    const cachePath = join(root, '.cache', `${spec.translation}.zip`); await mkdir(join(root, '.cache'), { recursive: true });
    let bytes: Uint8Array;
    try { bytes = await readFile(cachePath); }
    catch {
      const response = await fetch(spec.url, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error(`Source download failed: ${response.status}`);
      bytes = new Uint8Array(await response.arrayBuffer()); await writeFile(cachePath, bytes);
    }
    const digest = hash(bytes); const old = previous?.sources.find(s => s.translation === spec.translation);
    if (!update && old?.sha256 !== digest) throw new Error(`Upstream checksum changed for ${spec.translation}; review before using --update-lock.`);
    const archive = unzipSync(bytes); const corpus = new Map<string, Chapter[]>();
    for (const [name, content] of Object.entries(archive)) {
      if (!/\.(usfm|sfm)$/i.test(name)) continue;
      const text = strFromU8(content); const id = text.match(/\\id\s+(\w+)/)?.[1];
      if (!books.some(b => b.id === id)) continue;
      if (corpus.has(id!)) throw new Error(`Duplicate source book ${id}`);
      corpus.set(id!, parseUsfm(text));
    }
    let chapters = 0; let verses = 0; const index: [string, number, number, string][] = [];
    for (const book of books) {
      const contents = corpus.get(book.id);
      if (!contents || contents.length !== book.chapters) throw new Error(`${spec.translation} ${book.id}: expected ${book.chapters} chapters, found ${contents?.length ?? 0}`);
      for (let i = 0; i < contents.length; i++) {
        const chapter = contents[i]; if (chapter.chapter !== i + 1) throw new Error('Chapter order mismatch');
        const path = `data/chapters/${spec.translation}/${book.id}/${chapter.chapter}.json`;
        const json = JSON.stringify(chapter) + '\n';
        await mkdir(join(root, 'data', 'chapters', spec.translation, book.id), { recursive: true });
        await writeFile(join(root, path), json); manifest.files[path] = hash(json); chapters++;
        for (const verse of chapter.verses) { index.push([book.id, chapter.chapter, verse.number, verse.text]); verses++; }
      }
    }
    const indexPath = `data/search/${spec.translation}.json`; const indexJson = JSON.stringify(index) + '\n';
    await mkdir(join(root, 'data', 'search'), { recursive: true }); await writeFile(join(root, indexPath), indexJson); manifest.files[indexPath] = hash(indexJson);
    manifest.sources.push({ ...spec, sha256: digest, importedAt: old?.sha256 === digest ? old.importedAt : new Date().toISOString(),
      edition: TRANSLATIONS[spec.translation].edition, license: 'Public domain (see source for territorial and trademark notices)',
      attribution: TRANSLATIONS[spec.translation].attribution, books: corpus.size, chapters, verses });
    console.log(`${spec.translation}: ${corpus.size} books, ${chapters} chapters, ${verses} verses; source SHA-256 ${digest}`);
  }
  await mkdir(join(root, 'data'), { recursive: true }); await writeFile(lockPath, JSON.stringify(manifest, null, 2) + '\n');
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
