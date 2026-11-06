import fs from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
let source=await fs.readFile(new URL('../app/api/route-cameras/route.ts',import.meta.url),'utf8');
source=source.replace("import {env} from 'cloudflare:workers';",'const env={};').replaceAll("'../../../lib/road-routing'",JSON.stringify(new URL('../lib/road-routing.ts',import.meta.url).href)).replaceAll("'../../../lib/route-cameras'",JSON.stringify(new URL('../lib/route-cameras.ts',import.meta.url).href));
source=source.replace("'../../../lib/provider-http'",JSON.stringify(new URL('../lib/provider-http.ts',import.meta.url).href));
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
const oldFetch=globalThis.fetch,oldNow=Date.now;let now=oldNow(),calls=0;
Date.now=()=>now;
globalThis.fetch=async(url,options)=>{calls++;assert.ok(options.body.get('data').includes('node[highway=speed_camera](around:70,'));return Response.json({osm3s:{timestamp_osm_base:'2026-11-06T00:00:00Z'},elements:[{type:'node',id:1,lat:3,lon:101.005,tags:{highway:'speed_camera'}}]})};
const req=(routes)=>new Request('https://naviya.test/api/route-cameras',{method:'POST',headers:{Origin:'https://naviya.test','Content-Type':'application/json'},body:JSON.stringify({routes})});
try{
 const lines=[[[101,3],[101.01,3]],[[101,4],[101.01,4]]];
 let response=await POST(req(lines)),data=await response.json();assert.equal(response.status,200);assert.deepEqual(data.routes.map(r=>r.count),[1,0]);assert.ok(data.dataAsOf);assert.equal(data.available,true);
 await POST(req(lines));assert.equal(calls,1,'cache avoids duplicate upstream calls');
 now+=6000;globalThis.fetch=async()=>Response.json({remark:'runtime error: timeout',elements:[],osm3s:{timestamp_osm_base:'2026-11-06T00:00:00Z'}});
 response=await POST(req([[[101,5],[101.01,5]]]));data=await response.json();assert.equal(response.status,503);assert.equal(data.available,false);assert.equal(data.routes,undefined,'partial data must not become zero cameras');
 console.log('PASS camera API alternatives, complete zero, caching and rejection of partial provider responses');
}finally{globalThis.fetch=oldFetch;Date.now=oldNow}
