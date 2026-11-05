import assert from 'node:assert/strict';
import {validCoordinate,normalizeRoadRoutes} from '../lib/road-routing.ts';
assert.equal(validCoordinate(5.98,116.07),true);assert.equal(validCoordinate(1.55,110.35),true);assert.equal(validCoordinate(NaN,101),false);assert.equal(validCoordinate(51,0),false);
const road={distance:2500,duration:300,geometry:{type:'LineString',coordinates:[[101.7,3.15],[101.72,3.14]]},legs:[{steps:[{name:'Jalan Test',distance:2500,duration:300,maneuver:{type:'turn',modifier:'left'}}]}]};
assert.equal(normalizeRoadRoutes({code:'Ok',routes:[road]})[0].distance,2500);assert.equal(normalizeRoadRoutes({code:'Ok',routes:[road]})[0].steps[0].modifier,'left');assert.deepEqual(normalizeRoadRoutes({code:'NoRoute',routes:[road]}),[]);assert.equal(normalizeRoadRoutes({code:'Ok',routes:[{...road,distance:NaN}]}).length,0);assert.equal(normalizeRoadRoutes({code:'Ok',routes:[{...road,geometry:{type:'LineString',coordinates:[[null,3],[101,3]]}}]}).length,0);
console.log('PASS: road route normalization, coordinates, malformed geometry and provider NoRoute');
