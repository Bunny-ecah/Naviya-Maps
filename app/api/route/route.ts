import { env } from 'cloudflare:workers';
import { validCoordinate, normalizeRoadRoutes } from '../../../lib/road-routing';
export const dynamic='force-dynamic';
let nextRequest=0;
const cache=new Map<string,{expires:number;data:unknown}>();
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,fromLat=Number(p.get('fromLat')),fromLon=Number(p.get('fromLon')),toLat=Number(p.get('toLat')),toLon=Number(p.get('toLon')),mode=p.get('mode')||'car',avoid=p.get('avoidTolls')==='true';
 if(!['fromLat','fromLon','toLat','toLon'].every(k=>p.has(k))||!validCoordinate(fromLat,fromLon)||!validCoordinate(toLat,toLon))return Response.json({error:'Select an exact starting point and destination within Malaysia.'},{status:400});
 if(!['car','walk','cycle'].includes(mode))return Response.json({error:'A verified routing provider for this transport mode is not connected. No estimated itinerary has been invented.'},{status:422});
 if(fromLat===toLat&&fromLon===toLon)return Response.json({error:'Choose different starting and destination locations.'},{status:400});
 if(avoid&&mode!=='car')return Response.json({error:'Toll avoidance applies to driving routes only.'},{status:400});
 const configured=env as unknown as Record<string,string|undefined>;
 const base=mode==='car'?(configured.NAVIYA_ROUTER_CAR_URL||'https://router.project-osrm.org'):mode==='walk'?(configured.NAVIYA_ROUTER_WALK_URL||'https://routing.openstreetmap.de/routed-foot'):(configured.NAVIYA_ROUTER_CYCLE_URL||'https://routing.openstreetmap.de/routed-bike');
 const url=new URL(`${base.replace(/\/$/,'')}/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}`);url.search=new URLSearchParams({alternatives:'true',steps:'true',geometries:'geojson',overview:'full',generate_hints:'false',radiuses:'1000;1000'}).toString();if(avoid)url.searchParams.set('exclude','toll');
 const key=url.toString(),hit=cache.get(key);if(hit&&hit.expires>Date.now())return Response.json(hit.data,{headers:{'Cache-Control':'private, max-age=300'}});
 if(Date.now()<nextRequest)return Response.json({error:'Please wait a moment before requesting another route.'},{status:429,headers:{'Retry-After':'1'}});nextRequest=Date.now()+1200;
 try{const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'Naviya/1.0 road routing'},signal:AbortSignal.timeout(15000)});const data=await response.json() as {code:string};if(avoid&&['InvalidValue','InvalidOptions'].includes(data.code))return Response.json({error:'This routing service cannot verify toll avoidance. No toll-free route has been claimed.'},{status:422});if(!response.ok||data.code!=='Ok')return Response.json({error:data.code==='NoRoute'?'No connected road route was found between these places.':'The road service could not calculate this journey. Try nearby road-accessible points.'},{status:422});const routes=normalizeRoadRoutes(data);if(!routes.length)throw new Error('Invalid routing response');const output={routes,mode,avoidTolls:avoid,source:'OSRM / OpenStreetMap',liveTraffic:false,tollPricesAvailable:false};if(cache.size>=80)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+600000,data:output});return Response.json(output,{headers:{'Cache-Control':'private, max-age=300'}})}catch{return Response.json({error:'The road-routing service is temporarily unavailable. Please retry; no sample route has been substituted.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
