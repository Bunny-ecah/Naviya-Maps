import assert from 'node:assert/strict';
import {stripIdentityHeaders} from '../lib/public-hosting.ts';
const forged=new Request('https://naviya.example/api/account',{headers:{'OAI-Authenticated-User-Id':'victim','oai-authenticated-user-email':'v@example.com','accept':'application/json'}});
const clean=stripIdentityHeaders(forged,true);
assert.equal(clean.headers.get('oai-authenticated-user-id'),null,'forged id removed');
assert.equal(clean.headers.get('oai-authenticated-user-email'),null,'forged email removed');
assert.equal(clean.headers.get('accept'),'application/json','other headers kept');
assert.equal(stripIdentityHeaders(forged,false),forged,'ChatGPT Sites hosting keeps platform headers');
console.log('PASS: public hosting removes visitor-supplied identity headers');
