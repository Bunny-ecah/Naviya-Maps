import assert from 'node:assert/strict';
import {providerJson,endpoint,ServiceError,readJson} from '../lib/provider-http.ts';
import {database} from './sqlite-d1.mjs';
const {db,sql}=database(),original=globalThis.fetch;let calls=0;
try{
 assert.throws(()=>endpoint('http://insecure.test','https://safe.test'));assert.throws(()=>endpoint('https://user:pass@example.test','https://safe.test'));
 globalThis.fetch=async()=>{calls++;return Response.json({features:[]})};
 const url=new URL('https://provider.test/search?q=one');await Promise.all([providerJson(url,{service:'places',env:{DB:db}}),providerJson(url,{service:'places',env:{DB:db}})]);assert.equal(calls,1,'same concurrent query is coalesced');await providerJson(url,{service:'places',env:{DB:db}});assert.equal(calls,1,'cache avoids a new quota charge');
 let row=sql.prepare('SELECT requests FROM service_usage WHERE bucket LIKE ?').get('places:minute:%');assert.equal(row.requests,1);
 sql.prepare('UPDATE service_usage SET requests=60 WHERE bucket LIKE ?').run('places:minute:%');await assert.rejects(providerJson(new URL('https://provider.test/search?q=two'),{service:'places',env:{DB:db}}),e=>e instanceof ServiceError&&e.status===429);assert.equal(calls,1,'global quota stops upstream requests');
 globalThis.fetch=async()=>{calls++;return Response.json({remark:'timeout',features:[]})};await assert.rejects(providerJson(new URL('https://partial.test'),{service:'cameras'}),/incomplete/);
 globalThis.fetch=async()=>{calls++;return new Response('busy',{status:429,headers:{'Retry-After':'30'}})};await assert.rejects(providerJson(new URL('https://busy.test/one'),{service:'routing'}));const before=calls;await assert.rejects(providerJson(new URL('https://busy.test/two'),{service:'routing'}));assert.equal(calls,before,'circuit breaker respects provider cooldown');
 await assert.rejects(readJson(new Request('https://test',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(100)}),20),e=>e.status===413);
 console.log('PASS configurable HTTPS endpoints, coalescing, cache, shared quotas, partial failures, cooldown and body limits');
}finally{globalThis.fetch=original;sql.close()}
