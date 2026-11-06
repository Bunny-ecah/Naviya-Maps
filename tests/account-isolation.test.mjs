import fs from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {database} from './sqlite-d1.mjs';
const {db,sql}=database();globalThis.__naviyaTestDb=db;globalThis.__naviyaTestUser=null;
let source=await fs.readFile(new URL('../app/api/account/route.ts',import.meta.url),'utf8');
source=source.replace("import { env } from 'cloudflare:workers';",'const env={DB:globalThis.__naviyaTestDb};').replace("import { getChatGPTUser } from '../../chatgpt-auth';",'const getChatGPTUser=async()=>globalThis.__naviyaTestUser;').replace("'../../../lib/provider-http'",JSON.stringify(new URL('../lib/provider-http.ts',import.meta.url).href));
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});const api=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
const request=body=>new Request('https://naviya.test/api/account',{method:'POST',headers:{Origin:'https://naviya.test','Content-Type':'application/json'},body:JSON.stringify(body)});
const user=id=>globalThis.__naviyaTestUser={userId:id,email:id+'@example.test',displayName:id};
try{
 assert.equal((await api.GET()).status,401);assert.equal((await api.POST(request({action:'welcome'}))).status,401);
 user('alice');await api.POST(request({action:'welcome'}));await api.POST(request({action:'profile',name:'Alice'}));await api.POST(request({action:'welcome'}));assert.equal((await (await api.GET()).json()).balance,125);
 user('bob');await api.POST(request({action:'welcome'}));let bob=await (await api.GET()).json();assert.equal(bob.balance,100);assert.equal(bob.user.name,'bob');assert.equal(bob.records.some(r=>r.description==='Profile completed'),false);
 user('alice');await Promise.all([api.POST(request({action:'redeem',reward:'dusk'})),api.POST(request({action:'redeem',reward:'dusk'}))]);let alice=await (await api.GET()).json();assert.equal(alice.balance,75);assert.equal(alice.records.filter(r=>r.reward==='dusk').length,1);
 assert.equal((await api.POST(request({action:'redeem',reward:'badge'}))).status,409);
 const exported=await api.GET(new Request('https://naviya.test/api/account?download=true'));assert.match(exported.headers.get('Content-Disposition'),/attachment/);assert.equal((await exported.json()).user.name,'Alice');
 assert.equal((await api.POST(request({action:'delete',confirmation:'wrong'}))).status,400);assert.equal((await api.POST(request({action:'delete',confirmation:'DELETE MY NAVIYA DATA'}))).status,200);assert.equal((await (await api.GET()).json()).balance,0);
 user('bob');bob=await (await api.GET()).json();assert.equal(bob.balance,100);assert.equal(bob.user.name,'bob');
 const oversized=new Request('https://naviya.test/api/account',{method:'POST',headers:{Origin:'https://naviya.test','Content-Type':'application/json'},body:'x'.repeat(9000)});assert.equal((await api.POST(oversized)).status,413);
 console.log('PASS two-user isolation, duplicate redemption, insufficient balance, private export, scoped deletion and bounded bodies');
}finally{sql.close();delete globalThis.__naviyaTestDb;delete globalThis.__naviyaTestUser}
