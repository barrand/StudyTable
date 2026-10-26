import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { referenceLabel, type Reference, type Translation } from '../lib/books';
import { resolveReference } from '../lib/corpus';
import type { WordTerm } from '../lib/study';
import { ServiceError } from './errors';

export async function wordTerms(reference:Reference,translation:Translation='WEB'):Promise<WordTerm[]> {
  try {
    const chapter=JSON.parse(await readFile(join(process.cwd(),'data','words',reference.book,`${reference.chapter}.json`),'utf8')) as Record<string,WordTerm[]>;
    const terms=chapter[String(reference.verse)];
    if(!terms?.length)throw new ServiceError(422,'No licensed source-language terms are available for this verse in the bundled edition.');
    return Promise.all(terms.map(async term=>({...term,occurrences:(await Promise.all(term.occurrences.map(value=>resolveReference(value,translation)))).filter((value):value is Reference=>value!==null).map(referenceLabel)})));
  } catch(error) {
    if(error instanceof ServiceError)throw error;
    throw new ServiceError(503,'Source-language study data is not available yet. Other study actions remain available.');
  }
}
