import assert from 'node:assert/strict';
import {providerJson} from '../lib/provider-http.ts';
// Local dev database without the 0001 migration: every query fails with "no such table".
const DB={prepare(){return {bind(){return this},first(){throw new Error('D1_ERROR: no such table: service_usage')},run(){throw new Error('no such table')}}}};
let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({features:[]}),{headers:{'Content-Type':'application/json'}})};
const warn=console.warn;let warned=0;console.warn=()=>warned++;
const data=await providerJson(new URL('https://photon.example/api/?q=mall'),{service:'places',env:{DB},validate:d=>Array.isArray(d.features)});
await providerJson(new URL('https://photon.example/api/?q=klcc'),{service:'places',env:{DB}});
console.warn=warn;
assert.deepEqual(data,{features:[]});assert.equal(calls,2,'provider still called');assert.equal(warned,1,'warns once, not on every search');
console.log('PASS: search keeps working when the request-allowance table has not been migrated');
