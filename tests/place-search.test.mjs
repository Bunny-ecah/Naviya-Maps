import assert from 'node:assert/strict';
import {normalize,distanceKm} from '../lib/place-search.ts';
const feature=(name,cc,coords=[101.7,3.14])=>({properties:{name,countrycode:cc,osm_id:1,osm_type:'W',osm_value:'mall',street:'Jalan Test',city:'Kuala Lumpur'},geometry:{coordinates:coords}});
const data=normalize([feature('A <Mall>','MY'),feature('A <Mall>','MY'),feature('Foreign','SG'),feature('Invalid','MY',[null,3])]);
assert.equal(data.length,1);assert.equal(data[0].type,'Mall');assert.equal(data[0].name,'A <Mall>');assert.equal(data[0].lat,3.14);assert.equal(distanceKm(3,101,3,101),0);assert.ok(distanceKm(3,101,3.01,101)>1);
console.log('PASS: Malaysia filtering, invalid coordinates, deduplication, classification and distance');
