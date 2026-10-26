import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordTerms } from '../src/server/words';
import { study } from '../src/server/study-service';
import { MemoryStore } from '../src/server/store';
import { parseTagged } from '../scripts/import-words';
import manifest from '../data/word-source-lock.json';
import type { WordTerm } from '../src/lib/study';

test('Greek terms, transliteration, grammar and occurrences come from the pinned SBL edition data',async()=>{
  const terms=await wordTerms({book:'JHN',chapter:3,verse:16});
  assert.equal(terms.length,3);const love=terms.find(t=>t.id.startsWith('G0025:'))!;assert(love);
  assert.equal(love.lemma,'ἀγαπάω');assert.match(love.transliteration,/gap/);assert.match(love.grammar,/Aorist/);assert.match(love.edition,/SBLGNT/);assert(love.occurrences.length>0);
  assert(love.dictionaryGloss);
});
test('Hebrew and Aramaic terms are supported without the restricted Hebrew brief-lexicon definitions',async()=>{
  const [hebrew,aramaic]=await Promise.all([wordTerms({book:'GEN',chapter:1,verse:1}),wordTerms({book:'DAN',chapter:2,verse:5})]);
  assert.equal(hebrew.length,3);assert(hebrew.some(t=>t.id.startsWith('H1254A:')));assert(hebrew.every(t=>t.language==='Hebrew'&&!t.dictionaryGloss));
  assert(hebrew.every(t=>t.attestedGlosses!.length>0));assert(aramaic.some(t=>t.language==='Aramaic'));
  const excluded=manifest.sources.find(s=>s.path.startsWith('Lexicons/TBESH'))!;assert.equal(excluded.bundled,false);assert.match(excluded.license,/Excluded/);
});
test('Greek parser excludes readings outside the explicitly selected SBL edition',()=>{
  const input='Jhn.3.16#01=NKO\tἀγαπάω (agapaō)\tlove\tG0025=V-AAI-3S\tἀγαπάω=to love\tTR\nJhn.3.16#02=NKO\tθεός (theos)\tGod\tG2316=N-NSM\tθεός=God\tSBL+TR';
  const terms=parseTagged(input,true,new Map());assert.equal(terms.length,1);assert(terms[0].id.startsWith('G2316:'));
});
test('word-study generation is grounded in that verse’s terms and cannot return invented IDs',async()=>{
  const request={reference:'Genesis 1:1',translation:'WEB',action:'word-study'};
  let grounded:WordTerm[]=[];
  const config={store:new MemoryStore(),secret:'s'.repeat(40),model:'test-gemini',generate:async(_input:unknown,context:unknown)=>{
    grounded=(context as {sourceTerms:WordTerm[]}).sourceTerms;
    const comparison=(context as {translationComparison:{translation:string;verse:{text:string}}[]}).translationComparison;
    assert.deepEqual(comparison.map(c=>c.translation),['WEB','KJV']);assert(comparison.every(c=>c.verse.text.includes('created')));
    return {observations:['The verse introduces creation.'],interpretations:[],relatedReferences:[],cautions:['Observed glosses are not a complete lexical definition.'],terms:[{id:grounded[0].id,contextualMeaning:'Beginning in the context of this verse.',lexicalRange:'The bundled tags attest beginning and first; they do not supply a full lexical definition.'}]};
  }};
  const answer=await study(request,'a',config);assert.equal(answer.terms!.length,1);assert.equal(answer.terms![0].id,grounded[0].id);
  await assert.rejects(()=>study(request,'a',{...config,store:new MemoryStore(),generate:async()=>({observations:[],interpretations:[],relatedReferences:[],cautions:[],terms:[{id:'invented',contextualMeaning:'invented',lexicalRange:'invented'}]})}),/did not match/);
});
