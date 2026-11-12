import {providerJson,endpoint,serviceFailure,type ProviderEnvironment} from '../../../lib/provider-http';
import { env } from 'cloudflare:workers';
import { validCoordinate, normalizeRoadRoutes } from '../../../lib/road-routing';
export const dynamic='force-dynamic';

export async function GET(request:Request){
 const p=new URL(request.url).searchParams,fromLat=Number(p.get('fromLat')),fromLon=Number(p.get('fromLon')),toLat=Number(p.get('toLat')),toLon=Number(p.get('toLon')),mode=p.get('mode')||'car',avoid=p.get('avoidTolls')==='true';
 if(!['fromLat','fromLon','toLat','toLon'].every(k=>p.has(k))||!validCoordinate(fromLat,fromLon)||!validCoordinate(toLat,toLon))return Response.json({error:'Select an exact starting point and destination within Malaysia.'},{status:400});
 if(!['car','motorbike','walk','cycle'].includes(mode))return Response.json({error:'Train and bus journeys use the public transport planner. No road itinerary has been invented.'},{status:422});
 // Optional stops on the way ("lat,lon|lat,lon"), at most 3.
 const via=(p.get('via')||'').split('|').filter(Boolean).map(v=>v.split(',').map(Number));
 if(via.length>3||via.some(v=>v.length!==2||!validCoordinate(v[0],v[1])))return Response.json({error:'Add at most 3 stops within Malaysia.'},{status:400});
 if(fromLat===toLat&&fromLon===toLon)return Response.json({error:'Choose different starting and destination locations.'},{status:400});
 if(avoid&&!['car','motorbike'].includes(mode))return Response.json({error:'Toll avoidance applies to driving and riding routes only.'},{status:400});
 try{const configured=env as unknown as Record<string,string|undefined>;
 const road=mode==='car'||mode==='motorbike',base=road?(configured.NAVIYA_ROUTER_CAR_URL||'https://router.project-osrm.org'):mode==='walk'?(configured.NAVIYA_ROUTER_WALK_URL||'https://routing.openstreetmap.de/routed-foot'):(configured.NAVIYA_ROUTER_CYCLE_URL||'https://routing.openstreetmap.de/routed-bike');
 const coords=[[fromLon,fromLat],...via.map(v=>[v[1],v[0]]),[toLon,toLat]];
 const url=new URL(`${base.replace(/\/$/,'')}/route/v1/driving/${coords.map(c=>c.join(',')).join(';')}`);url.search=new URLSearchParams({alternatives:via.length?'false':'true',steps:'true',geometries:'geojson',overview:'full',generate_hints:'false',radiuses:coords.map(()=> '1000').join(';')}).toString();if(avoid)url.searchParams.set('exclude','toll');
 const data=await providerJson(endpoint(url.toString(),url.toString()),{service:'routing',env:env as unknown as ProviderEnvironment,timeout:15000,ttl:600000,validate:d=>typeof d.code==='string'}) as {code:string};if(avoid&&['InvalidValue','InvalidOptions'].includes(data.code))return Response.json({error:'This routing service cannot verify toll avoidance. No toll-free route has been claimed.'},{status:422});if(data.code!=='Ok')return Response.json({error:data.code==='NoRoute'?'No connected road route was found between these places.':'The road service could not calculate this journey. Try nearby road-accessible points.'},{status:422});const routes=normalizeRoadRoutes(data);if(!routes.length)throw new Error('Invalid routing response');// Motorcycles use the car road network: no public router models Malaysian motorcycle access rules.
 const output={routes,mode,avoidTolls:avoid,source:'OSRM / OpenStreetMap',roadNetwork:road?'car':mode,liveTraffic:false,tollPricesAvailable:false};return Response.json(output,{headers:{'Cache-Control':'private, max-age=300'}})}catch(error){return serviceFailure(error,'Road routing is temporarily unavailable. Please retry shortly.')}
}
