import assert from 'node:assert/strict';
import {cumulative,project,stopsAlongRoute,kindOf} from '../lib/along-route.ts';
// A straight 10 km road heading east along latitude 3.0
const route=[[101.0,3.0],[101.045,3.0],[101.09,3.0]];
const cum=cumulative(route);
assert.ok(Math.abs(cum[2]-10000)<60,'about 10 km');
const mid=project(route,cum,[101.045,3.001]);
assert.ok(Math.abs(mid.along-5000)<40&&Math.abs(mid.offset-111)<5,'5 km along, ~111 m off');
assert.equal(kindOf({amenity:'fuel'}),'petrol');assert.equal(kindOf({highway:'services'}),'rest');
assert.equal(kindOf({amenity:'place_of_worship',religion:'muslim'}),'surau');assert.equal(kindOf({amenity:'place_of_worship',religion:'christian'}),null);
const el=(id,lon,lat,tags,center)=>center?{type:'way',id,center:{lon,lat},tags}:{type:'node',id,lon,lat,tags};
const stops=stopsAlongRoute(route,[
 el(1,101.08,3.0005,{amenity:'fuel',brand:'Petronas'}),
 el(2,101.02,3.003,{highway:'rest_area',name:'R&R Test'},true),
 el(3,101.03,3.02,{amenity:'fuel'}),               // 2.2 km away: excluded
 el(4,101.06,3.004,{amenity:'place_of_worship',religion:'muslim',name:'Masjid Test'}),
 el(1,101.08,3.0005,{amenity:'fuel'}),             // duplicate
]);
assert.deepEqual(stops.map(s=>s.id),['way2','node4','node1'],'ordered by distance along the route');
assert.equal(stops[2].name,'Petronas');assert.equal(stops[0].kind,'rest');
// Thinning: 100 petrol stations on a 10 km road → at most 10 kept when perKind=10
const many=Array.from({length:100},(_,i)=>el(100+i,101+i*0.0009,3.0001,{amenity:'fuel'}));
assert.ok(stopsAlongRoute(route,many,10).length<=10);
console.log('PASS: along-route distance, corridor filtering, ordering, dedupe and thinning');
