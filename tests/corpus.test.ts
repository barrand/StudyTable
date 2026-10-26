import { test } from 'node:test';
import assert from 'node:assert/strict';
import { books, findBook, parseReference, readerUrl } from '../src/lib/books';
import { parseUsfm } from '../src/lib/usfm';
import { loadChapter, resolveReference, searchCorpus } from '../src/lib/corpus';

test('canonical book catalog, reference parsing and URL building',()=>{
  assert.equal(books.length,66);assert.equal(books.reduce((n,b)=>n+b.chapters,0),1189);
  assert.equal(findBook('1Corinthians')?.id,'1CO');assert.equal(findBook('psalm')?.id,'PSA');
  assert.deepEqual(parseReference('John 3:16'),{book:'JHN',chapter:3,verse:16});
  for(const value of ['John 0','John 22','John 3:0','made up 3:16','John 3:16-20','John 3:16 more'])assert.equal(parseReference(value),null,value);
  assert.equal(readerUrl({book:'1CO',chapter:13,verse:4},'KJV'),'/bible/1-corinthians/13?verse=4&translation=KJV');
  assert.throws(()=>readerUrl({book:'../../',chapter:1}));
});
test('USFM preserves styled words and punctuation without footnotes, attributes or headings',()=>{
  const [chapter]=parseUsfm(String.raw`\id JDG
\c 5
\s1 Not scripture
\v 4 \nd \+w LORD|strong="H3068"\+w*\nd*, when \w thou|strong="H0859"\w* wentest.\f + \ft Editorial note\f*
\q1 Poetry continues.
\s2 Another heading
\v 5 Next verse.\x + \xt John 3:16\x*`);
  assert.deepEqual(chapter.verses,[{number:4,text:'LORD, when thou wentest. Poetry continues.'},{number:5,text:'Next verse.'}]);
});
test('USFM represents omissions and bridges explicitly and rejects duplicate IDs',()=>{
  assert.deepEqual(parseUsfm(String.raw`\id LUK
\c 17
\v 36 \f + \ft Not present in this edition\f*
\v 37-38 Combined verse.`)[0].verses,[{number:36,text:'',omitted:true},{number:37,text:'Combined verse.',endVerse:38}]);
  assert.throws(()=>parseUsfm(String.raw`\id GEN
\c 1
\v 1 first
\v 1 second`),/Duplicate/);
});
test('USFM retains Selah and fails rather than silently dropping unknown verse content',()=>{
  const chapter=parseUsfm(String.raw`\id PSA
\c 3
\v 2 There is no help for him in God.\qs Selah.\qs*`)[0];
  assert.equal(chapter.verses[0].text,'There is no help for him in God. Selah.');
  assert.throws(()=>parseUsfm(String.raw`\id GEN
\c 1
\v 1 Words.\unknown More scripture.`),/Unsupported marker/);
});
test('real corpus resolves exact verses and keeps translations distinct',async()=>{
  const [kjv,web,judges]=await Promise.all([loadChapter({book:'John',chapter:3},'KJV'),loadChapter({book:'JHN',chapter:3},'WEB'),loadChapter({book:'JDG',chapter:5},'KJV')]);
  assert.match(kjv.verses.find(v=>v.number===16)!.text,/only begotten Son/);
  assert.match(web.verses.find(v=>v.number===16)!.text,/only born Son/);
  assert.match(judges.verses.find(v=>v.number===4)!.text,/LORD, when/);
  assert.equal(await resolveReference('John 3:999','WEB'),null);
  assert.throws(()=>loadChapter({book:'../../etc',chapter:1},'WEB'));
});
test('literal search, invalid references, result limits and translation-aware results',async()=>{
  assert.deepEqual((await searchCorpus('John 3:16','KJV')).reference,{book:'JHN',chapter:3,verse:16});
  assert.equal((await searchCorpus('John 3:999','WEB')).total,0);
  const result=await searchCorpus('ONLY BEGOTTEN SON','KJV');assert(result.results.some(r=>r[0]==='JHN'&&r[1]===3&&r[2]===16));
  assert.equal((await searchCorpus('.*','WEB')).total,0);
  const many=await searchCorpus('God','KJV',3);assert(many.total>3);assert.equal(many.results.length,3);
  const love=await searchCorpus('love','KJV',200);assert(love.results.every(row=>/\blove\b/i.test(row[3])));
  assert.equal((await searchCorpus('""','WEB')).total,0);
});
