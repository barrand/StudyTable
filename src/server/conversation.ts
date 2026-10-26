import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ServiceError } from './errors';
import type { StudyResult } from '../lib/study';

const TurnSchema=z.object({question:z.string().max(500),answer:z.string().max(2000)}).strict();
const ConversationSchema=z.object({v:z.literal(1),reference:z.string().max(80),translation:z.enum(['WEB','KJV']),expires:z.number().int(),turns:z.array(TurnSchema).max(3)}).strict();
export type ConversationTurn=z.infer<typeof TurnSchema>;
function signature(payload:string,secret:string) {return createHmac('sha256',secret).update('study-conversation-v1|'+payload).digest('base64url');}
export function readConversation(token:string|undefined,reference:string,translation:'WEB'|'KJV',secret:string,now=Date.now()):ConversationTurn[] {
  if(!token)return [];
  try {
    if(token.length>16000)throw new Error();
    const [payload,sig,...extra]=token.split('.');if(extra.length||!payload||!sig)throw new Error();
    const actual=Buffer.from(sig);const expected=Buffer.from(signature(payload,secret));
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error();
    const value=ConversationSchema.parse(JSON.parse(Buffer.from(payload,'base64url').toString()));
    if(value.reference!==reference||value.translation!==translation||value.expires<=now)throw new Error();
    return value.turns;
  }catch{throw new ServiceError(400,'This conversation expired or no longer matches the passage. Start a new conversation.');}
}
export function nextConversation(reference:string,translation:'WEB'|'KJV',turns:ConversationTurn[],question:string,result:StudyResult,secret:string,now=Date.now()) {
  const answer=[result.summary,result.bookContext,result.authorshipAndAudience,result.historicalSettingAndPeople,...result.observations,...result.interpretations,...result.relatedReferences.map(r=>`${r.reference}: ${r.explanation}`),...result.cautions].filter(Boolean).join('\n').slice(0,2000);
  const value={v:1,reference,translation,expires:now+8*60*60*1000,turns:[...turns,{question,answer}].slice(-3)};
  let payload=Buffer.from(JSON.stringify(value)).toString('base64url');
  while(payload.length>15000&&value.turns.length>1){value.turns.shift();payload=Buffer.from(JSON.stringify(value)).toString('base64url');}
  return `${payload}.${signature(payload,secret)}`;
}
