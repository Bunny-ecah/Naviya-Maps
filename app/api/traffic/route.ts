import {env} from 'cloudflare:workers';
import {providerJson,serviceFailure,type ProviderEnvironment} from '../../../lib/provider-http';
import {validCoordinate} from '../../../lib/road-routing';
export const dynamic='force-dynamic';

/**
 * Live traffic through TomTom, only when NAVIYA_TOMTOM_KEY is configured as a server secret.
 * - ?status=1                       → whether live traffic is switched on
 * - ?tile=z/x/y                     → traffic-flow overlay tile (key never reaches the browser)
 * - ?fromLat&fromLon&toLat&toLon    → current-traffic driving time and delay
 * Without a key every call answers {available:false}; nothing is estimated or simulated.
 */
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,key=(env as unknown as Record<string,string|undefined>).NAVIYA_TOMTOM_KEY;
 if(!key)return Response.json({available:false,reason:'Live traffic provider not configured.'},{headers:{'Cache-Control':'private, max-age=300'}});
 if(p.has('status'))return Response.json({available:true,source:'TomTom Traffic'},{headers:{'Cache-Control':'private, max-age=300'}});
 if(p.has('tile')){
  const m=/^(\d{1,2})\/(\d{1,6})\/(\d{1,6})$/.exec(p.get('tile')||'');
  const [z,x,y]=m?m.slice(1).map(Number):[];
  if(!m||z<5||z>18||x>=2**z||y>=2**z)return new Response('Bad tile',{status:400});
  const upstream=await fetch(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${z}/${x}/${y}.png?tileSize=256&key=${encodeURIComponent(key)}`,{signal:AbortSignal.timeout(8000)}).catch(()=>null);
  if(!upstream?.ok)return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  return new Response(upstream.body,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=60'}});
 }
 const fromLat=Number(p.get('fromLat')),fromLon=Number(p.get('fromLon')),toLat=Number(p.get('toLat')),toLon=Number(p.get('toLon'));
 if(!validCoordinate(fromLat,fromLon)||!validCoordinate(toLat,toLon))return Response.json({error:'Select an exact starting point and destination within Malaysia.'},{status:400});
 try{
  const url=new URL(`https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json`);
  url.search=new URLSearchParams({key,traffic:'true',travelMode:'car',routeType:'fastest',computeTravelTimeFor:'all'}).toString();
  const data=await providerJson(url,{service:'traffic',env:env as unknown as ProviderEnvironment,timeout:10000,ttl:120000,validate:d=>Array.isArray(d.routes)&&d.routes.length>0}) as any;
  const s=data.routes[0].summary||{};
  if(!Number.isFinite(s.travelTimeInSeconds))throw new Error('Incomplete traffic response');
  return Response.json({available:true,durationSeconds:s.travelTimeInSeconds,delaySeconds:Math.max(0,s.trafficDelayInSeconds||0),noTrafficSeconds:s.noTrafficTravelTimeInSeconds??null,distance:s.lengthInMeters,checkedAt:new Date().toISOString(),source:'TomTom Traffic'},{headers:{'Cache-Control':'private, max-age=60'}});
 }catch(error){return serviceFailure(error,'Live traffic is temporarily unavailable. Road estimates are still shown.')}
}
