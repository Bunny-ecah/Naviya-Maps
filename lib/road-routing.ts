export function validCoordinate(lat:number,lon:number){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=0&&lat<=8&&lon>=99&&lon<=120}

/** A maneuver point [lon,lat] inside Malaysia, or null. */
function validLocation(l:any):[number,number]|null{return Array.isArray(l)&&l.length>=2&&validCoordinate(l[1],l[0])?[l[0],l[1]]:null}

/** True when the router marks any part of this step as a toll road (OSRM `intersections[].classes`). */
function stepUsesToll(step:any){return Array.isArray(step?.intersections)&&step.intersections.some((i:any)=>Array.isArray(i?.classes)&&i.classes.includes('toll'))}

/**
 * Summarises toll-road use from OSRM step data. This says WHETHER a route uses tolled roads and for how long;
 * it never estimates a price, because no verified toll tariff feed is connected.
 */
export function tollSummary(steps:any[]){
 let distance=0;const roads=new Set<string>();
 for(const s of steps){if(!stepUsesToll(s))continue;distance+=Number.isFinite(s.distance)?s.distance:0;const label=[typeof s.ref==='string'?s.ref.split(';')[0].trim():'',typeof s.name==='string'?s.name.trim():''].filter(Boolean).join(' ');if(label)roads.add(label)}
 return {uses:distance>0,distance:Math.round(distance),roads:[...roads].slice(0,4)};
}

export function normalizeRoadRoutes(data:any){
 if(data?.code!=='Ok'||!Array.isArray(data.routes))return [];
 return data.routes
  .filter((r:any)=>Number.isFinite(r.distance)&&r.distance>0&&Number.isFinite(r.duration)&&r.duration>0&&r.geometry?.type==='LineString'&&Array.isArray(r.geometry.coordinates)&&r.geometry.coordinates.length>=2&&r.geometry.coordinates.every((c:any)=>Array.isArray(c)&&c.length>=2&&validCoordinate(c[1],c[0])))
  .sort((a:any,b:any)=>a.duration-b.duration).slice(0,3)
  .map((r:any)=>{const raw=(r.legs||[]).flatMap((l:any)=>l.steps||[]);return {distance:r.distance,duration:r.duration,geometry:r.geometry,toll:tollSummary(raw),steps:raw.map((s:any)=>({name:typeof s.name==='string'?s.name:'',distance:s.distance,duration:s.duration,type:s.maneuver?.type||'continue',modifier:s.maneuver?.modifier||'',ref:typeof s.ref==='string'?s.ref:'',toll:stepUsesToll(s),location:validLocation(s.maneuver?.location),exit:Number.isInteger(s.maneuver?.exit)?s.maneuver.exit:null}))}});
}
