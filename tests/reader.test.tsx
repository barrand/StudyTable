import React from 'react';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { books } from '../src/lib/books';
import { loadChapter } from '../src/lib/corpus';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
for(const name of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','getComputedStyle','localStorage'])Object.defineProperty(globalThis,name,{value:(dom.window as unknown as Record<string,unknown>)[name],configurable:true});
Object.defineProperty(globalThis,'self',{value:dom.window,configurable:true});
globalThis.requestAnimationFrame=callback=>setTimeout(()=>callback(0),0) as unknown as number;
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const {render,screen,fireEvent,cleanup,waitFor}=await import('@testing-library/react');
const {default:Reader}=await import('../src/components/reader');
const chapters={WEB:await loadChapter({book:'JHN',chapter:3},'WEB'),KJV:await loadChapter({book:'JHN',chapter:3},'KJV')};
const answer={result:{observations:['The passage is part of a conversation.'],interpretations:[],relatedReferences:[],cautions:[],summary:'A chapter summary',bookContext:'In the book',authorshipAndAudience:'Authorship is debated.',historicalSettingAndPeople:'Nicodemus and Jesus.'},reference:'John 3',translation:'WEB',action:'chapter-overview',cached:true,generatedAt:'2026-10-25T00:00:00Z',model:'test-gemini',cacheVersion:'1'};
afterEach(()=>{cleanup();localStorage.clear();});

test('reader verse disclosure uses exact corpus text, closes/reset on selection, and restores focus',async()=>{
  render(<Reader book={books[42]} chapters={chapters}/>);
  const trigger=screen.getByRole('button',{name:'Study John 3:16'});fireEvent.click(trigger);
  const details=screen.getByText('Translations').closest('details')!;assert.equal(details.open,false);
  assert.match(details.textContent!,/only born Son/);assert.match(details.textContent!,/only begotten Son/);
  fireEvent.click(details.querySelector('summary')!); // Native disclosure keyboard/click behavior belongs to browser coverage.
  details.open=true;fireEvent.click(screen.getByRole('button',{name:'Study John 3:17'}));
  const nextDetails=screen.getByText('Translations').closest('details')!;assert.equal(nextDetails.open,false);assert.doesNotMatch(nextDetails.textContent!,/only begotten Son/);
  fireEvent.keyDown(document,{key:'Escape'});assert.equal(screen.queryByRole('complementary'),null);assert.equal(document.activeElement,screen.getByRole('button',{name:'Study John 3:17'}));
});
test('chapter overview uses Gemini route with chapter scope and hides verse controls',async()=>{
  const calls:unknown[]=[];globalThis.fetch=async(_url,options)=>{calls.push(JSON.parse(String(options?.body)));return Response.json(answer);};
  render(<Reader book={books[42]} chapters={chapters}/>);fireEvent.click(screen.getByRole('button',{name:/Chapter overview/}));
  await screen.findByText('A chapter summary');assert.equal(calls.length,1);
  assert.deepEqual(calls[0],{reference:'John 3',translation:'WEB',action:'chapter-overview'});
  assert.equal(screen.queryByText('Translations'),null);assert(screen.getByText(/John 3 · WEB · Whole chapter/));
});
test('late AI response cannot overwrite a newly selected verse',async()=>{
  let complete!:(response:Response)=>void;
  globalThis.fetch=()=>new Promise(resolve=>{complete=resolve;});
  render(<Reader book={books[42]} chapters={chapters}/>);fireEvent.click(screen.getByRole('button',{name:/Chapter overview/}));
  fireEvent.click(screen.getByRole('button',{name:'Study John 3:16'}));complete(Response.json(answer));
  await waitFor(()=>assert.equal(screen.queryByText('A chapter summary'),null));
  assert(screen.getByText('John 3:16 · WEB'));
});
test('reading translation is restored locally; direct-link translation takes precedence',async()=>{
  localStorage.setItem('study-table:translation','KJV');
  const first=render(<Reader book={books[42]} chapters={chapters}/>);
  fireEvent.click(screen.getByRole('button',{name:'Study John 3:16'}));
  assert.equal(screen.getByText('Translations').closest('details')!.querySelector('h3')!.textContent,'KJV');
  first.unmount();render(<Reader book={books[42]} chapters={chapters} initialTranslation="WEB"/>);
  fireEvent.click(screen.getByRole('button',{name:'Study John 3:16'}));
  assert.equal(screen.getByText('Translations').closest('details')!.querySelector('h3')!.textContent,'WEB');
});
