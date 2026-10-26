import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { books, findBook, referenceLabel } from '../src/lib/books';
import type { WordTerm } from '../src/lib/study';

export const STEP_COMMIT='be4191f0082aeedddb0eff0c02c966292b2bd641';
export const STEP_PATHS=[
  'Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
  'Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
  'Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'Translators Amalgamated OT+NT/TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'Translators Amalgamated OT+NT/TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'Translators Amalgamated OT+NT/TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
  'Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt',
  'Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt',
  'Morphology codes/TEHMC - Translators Expansion of Hebrew Morphology Codes - STEPBible.org CC BY.txt'
];
export async function downloadStep() {
  const cacheDirectory=join('.cache','step',STEP_COMMIT);await mkdir(cacheDirectory,{recursive:true});
  const files=await Promise.all(STEP_PATHS.map(async(path,index)=>{
    const local=join(cacheDirectory,`${index}.txt`);let text:string;
    const url=`https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${STEP_COMMIT}/${path.split('/').map(encodeURIComponent).join('/')}`;
    try{text=await readFile(local,'utf8');}catch{const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error(`STEP download ${response.status}: ${path}`);text=await response.text();await writeFile(local,text);}
    return {path,url,text,sha256:createHash('sha256').update(text).digest('hex')};
  }));
  return files;
}
export interface TaggedTerm extends WordTerm { strong:string; reference:string; useful:boolean }
export function parseTagged(text:string,greek:boolean,grammar:Map<string,string>):TaggedTerm[] {
  const output:TaggedTerm[]=[];const seen=new Set<string>();
  for(const line of text.split(/\r?\n/)) {
    const columns=line.split('\t');const match=columns[0]?.match(/^(\w+)\.(\d+)\.(\d+)#(\d+)=([^\t]+)/);
    if(!match)continue;
    if(greek?!columns[5]?.split('+').includes('SBL'):!match[5].startsWith('L'))continue;
    const book=findBook(match[1]);if(!book)throw new Error(`Unknown STEP book ${match[1]}`);
    const reference=referenceLabel({book:book.id,chapter:+match[2],verse:+match[3]});
    const tokenKey=`${reference}#${match[4]}`;if(seen.has(tokenKey))continue;seen.add(tokenKey);
    let strong:string|undefined;let form:string;let transliteration:string;let lemma:string;let code:string;let gloss:string;let language:string;
    if(greek) {
      strong=columns[3]?.match(/G\d{4}[a-zA-Z]?/)?.[0];
      const token=columns[1]?.match(/^(.+?)\s+\((.+)\)$/);if(!token||!strong)continue;
      form=token[1];transliteration=token[2];lemma=columns[4]?.split('=')[0]??form;code=columns[3].split('=')[1]??'';gloss=columns[2];language='Greek';
    } else {
      strong=columns[8]?.match(/H\d{4}[A-Z]?/)?.[0]??columns[4]?.match(/H(?!9)\d{4}[A-Z]?/)?.[0];if(!strong)continue;
      form=columns[1];transliteration=columns[2];gloss=columns[3];
      // Only the lemma form is extracted from the tag, never the embedded brief-lexicon definition.
      lemma=columns[11]?.match(new RegExp(`${strong}=([^=]+)=`))?.[1]??form;
      const parts=columns[5].split('/');const rootPart=parts.find(p=>/^[HA]?[NVAP]/.test(p))??parts[0];
      code=/^[HA]/.test(rootPart)?rootPart:`${columns[5][0]}${rootPart}`;language=code.startsWith('A')?'Aramaic':'Hebrew';
    }
    if(!form||!transliteration||!gloss)continue;
    output.push({id:`${strong}:${match[4]}`,strong,reference,form,lemma,transliteration,gloss,grammar:grammar.get(code)??`Source morphology: ${code}`,language,
      edition:greek?'STEPBible TAGNT · SBLGNT edition words':'STEPBible TAHOT · Leningrad written readings (L rows)',occurrences:[],attestedGlosses:[],useful:greek?/^(V-|N-|A-)/.test(code):/^[HA][NVA]/.test(code)});
  }
  return output;
}
async function main() {
  let previous:{version:string;importedAt:string;sources:{sha256:string}[];files:Record<string,string>}|undefined;
  try{previous=JSON.parse(await readFile('data/word-source-lock.json','utf8'));}catch{/* First reviewed import. */}
  if(process.argv.includes('--verify')) {
    if(!previous||Object.keys(previous.files).length!==1189)throw new Error('Incomplete word-study manifest');
    for(const [path,digest] of Object.entries(previous.files))if(createHash('sha256').update(await readFile(path)).digest('hex')!==digest)throw new Error(`Word data checksum mismatch: ${path}`);
    console.log('Verified 1189 word-study chapter files offline.');return;
  }
  const files=await downloadStep();
  if(process.argv.includes('--inspect')) {for(const [index,file] of files.entries())console.log(`FILE ${index}: ${file.path}\n${file.text.slice(0,2200)}`);return;}
  const approved=files.filter((_file,index)=>index!==7);
  if(previous&&!process.argv.includes('--update-lock'))for(const [index,file] of files.entries())if(previous.sources[index]?.sha256!==file.sha256)throw new Error('STEP source changed; review before --update-lock.');
  for(const file of approved)if(!/CC BY 4\.0/.test(file.text.slice(0,5000))||/Permission should be gained/.test(file.text.slice(0,2500)))throw new Error(`Source license requires review: ${file.path}`);
  const grammar=new Map<string,string>();
  for(const file of [files[8],files[9]])for(const line of file.text.split(/\r?\n/)){const [code,explanation]=line.split('\t');if(explanation?.startsWith('Function='))grammar.set(code,explanation.replace(/\s+/g,' ').trim());}
  const tagged=files.slice(0,6).flatMap((file,index)=>parseTagged(file.text,index<2,grammar));
  const greekGlosses=new Map<string,string>();
  for(const line of files[6].text.split(/\r?\n/)) {const row=line.split('\t');if(/^G\d{4}/.test(row[2]??'')&&row[6])greekGlosses.set(row[2],row[6]);}
  const groups=new Map<string,{references:Set<string>;glosses:Set<string>}>();
  for(const term of tagged) {const group=groups.get(term.strong)??{references:new Set(),glosses:new Set()};group.references.add(term.reference);group.glosses.add(term.gloss);groups.set(term.strong,group);}
  const byVerse=new Map<string,TaggedTerm[]>();
  for(const term of tagged){const list=byVerse.get(term.reference)??[];if(!list.some(item=>item.strong===term.strong))list.push(term);byVerse.set(term.reference,list);}
  const version=createHash('sha256').update(approved.map(f=>f.sha256).join('|')+'normalized-v2').digest('hex');
  const paths:Record<string,string>={};let count=0;
  for(const book of books)for(let chapter=1;chapter<=book.chapters;chapter++) {
    const corpus=JSON.parse(await readFile(join('data','chapters','KJV',book.id,`${chapter}.json`),'utf8')) as {verses:{number:number}[]};
    const output:Record<string,WordTerm[]>={};
    for(const verse of corpus.verses) {
      const reference=referenceLabel({book:book.id,chapter,verse:verse.number});const candidates=byVerse.get(reference)??[];
      const useful=candidates.filter(t=>t.useful);const chosen=(useful.length?useful:candidates).slice(0,3);
      if(chosen.length)output[String(verse.number)]=chosen.map(term=>{
        const {strong,reference:_ref,useful:_useful,...data}=term;const group=groups.get(strong)!;
        return {...data,...(greekGlosses.has(strong)?{dictionaryGloss:greekGlosses.get(strong)}:{}),occurrences:[...group.references].filter(r=>r!==reference).slice(0,5),attestedGlosses:[...group.glosses].slice(0,12)};
      });
      count+=chosen.length;
    }
    const path=`data/words/${book.id}/${chapter}.json`;const json=JSON.stringify(output)+'\n';await mkdir(join('data','words',book.id),{recursive:true});await writeFile(path,json);paths[path]=createHash('sha256').update(json).digest('hex');
  }
  const manifest={version,commit:STEP_COMMIT,importedAt:previous?.version===version?previous.importedAt:new Date().toISOString(),attribution:'STEP Bible (https://www.stepbible.org), based on work at Tyndale House, Cambridge. CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).',
    changes:'Normalized tagged words into up to three distinct content terms per English-numbered verse; selected SBL edition words for Greek, Leningrad written L rows for Hebrew/Aramaic; expanded morphology; collected observed glosses and up to five other occurrences. No full lexicon definitions or Hebrew brief-lexicon definitions are redistributed. Observed glosses are not a complete dictionary lexical range.',
    sources:files.map((file,index)=>({path:file.path,url:file.url,sha256:file.sha256,license:index===7?'Excluded: header requests separate Online Bible permission for definitions':'CC BY 4.0, confirmed in this file header',bundled:index!==7})),files:paths,terms:count};
  await writeFile('data/word-source-lock.json',JSON.stringify(manifest,null,2)+'\n');console.log(`Imported ${count} source-language terms across ${Object.keys(paths).length} chapter files; excluded TBESH definitions pending separate permission.`);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
