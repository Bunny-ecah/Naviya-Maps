import assert from 'node:assert/strict';
import {decodeVehicleFeed,feedsNear} from '../lib/gtfs-realtime.ts';
import {normalizeRoadRoutes,tollSummary} from '../lib/road-routing.ts';

// --- tiny protobuf encoder, test-only ---
const varint=n=>{const out=[];do{let b=n%128;n=Math.floor(n/128);if(n)b|=128;out.push(b)}while(n);return out};
const key=(f,w)=>varint(f*8+w);
const bytes=(f,arr)=>[...key(f,2),...varint(arr.length),...arr];
const str=(f,s)=>bytes(f,[...new TextEncoder().encode(s)]);
const flt=(f,x)=>{const b=new Uint8Array(4);new DataView(b.buffer).setFloat32(0,x,true);return [...key(f,5),...b]};
const num=(f,n)=>[...key(f,0),...varint(n)];

const vehicle=(id,lat,lon,route,plate,ts)=>bytes(2,[...str(1,id),...bytes(4,[
 ...bytes(1,[...str(1,'trip-'+id),...str(5,route)]),
 ...bytes(2,[...flt(1,lat),...flt(2,lon),...flt(3,90),...flt(5,10)]),
 ...num(5,ts),
 ...bytes(8,[...str(1,'veh-'+id),...str(3,plate)]),
 ...num(99,7), // unknown field must be skipped
])]);
const feed=new Uint8Array([...bytes(1,[...str(1,'2.0'),...num(3,1762905600)]),...vehicle('a',3.1579,101.7119,'T789','WTE 1234',1762905590),...vehicle('b',1.4927,103.7414,'P101','JTA 55',1762905500),...bytes(2,[...str(1,'no-position')])]);
const decoded=decodeVehicleFeed(feed);
assert.equal(decoded.feedTimestamp,1762905600);
assert.equal(decoded.vehicles.length,2,'entities without a position are dropped');
const [a]=decoded.vehicles;
assert.equal(a.id,'veh-a');assert.equal(a.routeId,'T789');assert.equal(a.tripId,'trip-a');assert.equal(a.plate,'WTE 1234');
assert.ok(Math.abs(a.lat-3.1579)<1e-4&&Math.abs(a.lon-101.7119)<1e-4);
assert.equal(a.speedKmh,36);assert.equal(a.bearing,90);assert.equal(a.timestamp,1762905590);
assert.throws(()=>decodeVehicleFeed(feed.slice(0,feed.length-3)),/Truncated/);
assert.deepEqual(decodeVehicleFeed(new Uint8Array()).vehicles,[]);

assert.ok(feedsNear(3.1579,101.7119).some(f=>f.id==='rapid-bus-kl'),'KL gets Rapid KL');
assert.ok(feedsNear(1.4927,103.7414).some(f=>f.id==='mybas-johor'),'JB gets BAS.MY Johor');
assert.ok(feedsNear(1.55,110.35).some(f=>f.id==='mybas-kuching'),'Kuching gets BAS.MY Kuching');
assert.equal(feedsNear(5.98,116.07).length,0,'Kota Kinabalu has no official live feed');
console.log('PASS: GTFS Realtime vehicle decoding, truncation errors and feed selection');

const step=(name,ref,distance,toll)=>({name,ref,distance,duration:60,maneuver:{type:'continue'},intersections:[{classes:toll?['toll','motorway']:['motorway']}]});
const road={code:'Ok',routes:[{distance:20000,duration:1500,geometry:{type:'LineString',coordinates:[[101.69,3.13],[101.71,3.15]]},legs:[{steps:[step('Jalan Ampang','',3000,false),step('Maju Expressway','E37',9000,true),step('Persiaran','',8000,false)]}]}]};
const [r]=normalizeRoadRoutes(road);
assert.deepEqual(r.toll,{uses:true,distance:9000,roads:['E37 Maju Expressway']});
assert.equal(r.steps[1].toll,true);assert.equal(r.steps[0].toll,false);
assert.deepEqual(tollSummary([{distance:500,intersections:[{}]}]),{uses:false,distance:0,roads:[]});
assert.deepEqual(tollSummary([{distance:500}]),{uses:false,distance:0,roads:[]},'steps without intersection data are not treated as toll');
console.log('PASS: toll-road detection from routing classes, without price estimates');
