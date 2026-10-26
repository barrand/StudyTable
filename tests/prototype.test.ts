import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

function prototype() {
  const wrapper=new JSDOM(readFileSync('study-table-prototype.html','utf8'));
  const html=wrapper.window.document.querySelector('iframe')!.getAttribute('srcdoc')!;
  const dom=new JSDOM(html,{runScripts:'outside-only'});
  const script=[...dom.window.document.querySelectorAll('script')].find(s=>s.textContent.includes('const chapterOverviews ='))!;
  dom.window.eval(script.textContent);
  return dom;
}
test('prototype chapter overview, verse translations, focus and exact selected text',()=>{
  const dom=prototype();const doc=dom.window.document;
  const click=(id:string)=>(doc.getElementById(id) as HTMLElement).click();
  click('st-choose-bible');(doc.querySelector('[data-book="John"]') as HTMLElement).click();(doc.querySelector('[data-chapter="3"]') as HTMLElement).click();
  click('st-chapter-overview');assert.match(doc.getElementById('st-response')!.textContent!,/Nicodemus/);assert.equal(doc.getElementById('st-verse-tools')!.hidden,true);
  click('st-close');assert.equal(doc.activeElement,doc.getElementById('st-chapter-overview'));
  (doc.querySelector('[data-verse="16"]') as HTMLElement).click();
  const details=doc.getElementById('st-verse-translations') as HTMLDetailsElement;
  assert.equal(details.open,false);assert.match(doc.getElementById('st-compare-grid')!.textContent!,/only begotten Son/);
  details.open=true;(doc.querySelector('[data-verse="17"]') as HTMLElement).click();assert.equal(details.open,false);
  assert.match(doc.getElementById('st-compare-grid')!.textContent!,/condemn the world/);assert.doesNotMatch(doc.getElementById('st-compare-grid')!.textContent!,/only begotten Son/);
  dom.window.close();
});
