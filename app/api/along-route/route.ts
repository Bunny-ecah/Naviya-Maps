import {providerJson,endpoint,readJson,ServiceError,type ProviderEnvironment} from '../../../lib/provider-http';
import {env} from 'cloudflare:workers';
import {validCoordinate} from '../../../lib/road-routing';
import {simplify,type Point} from '../../../lib/route-cameras';
import {stopsAlongRoute} from '../../../lib/along-route';
export const dynamic='force-dynamic';

/** R&R, petrol, EV chargers and surau/masjid along a route, from OpenStreetMap via Overpass. */
export async function POST(request:Request){
 const fail=(message:string,status=503)=>Response.json({error:message,available:false},{status,headers:{'Cache-Control':'no-store',...(status>=500||status===429?{'Retry-After':'30'}:{})}});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return fail('This request must come from Naviya.',403);
 let route:Point[];
 try{const data=await readJson(request,1500000);route=data?.route}catch(error){return fail(error instanceof Error?error.message:'Invalid route data.',error instanceof ServiceError?error.status:400)}
 if(!Array.isArray(route)||route.length<2||route.length>20000||route.some(p=>!Array.isArray(p)||p.length!==2||!validCoordinate(p[1],p[0])))return fail('Valid Malaysian route geometry is required.',400);
 // A coarser line keeps long highway trips within Overpass limits; corridors include the simplification tolerance.
 let line=simplify(route,60);if(line.length>1200)line=simplify(route,150);
 if(line.length>1500)return fail('This route is too long to check for stops.',422);
 const around=(r:number)=>`(around:${r},${line.map(p=>p[1].toFixed(5)+','+p[0].toFixed(5)).join(',')})`;
 const query=`[out:json][timeout:25];(nwr[amenity=fuel]${around(400)};nwr[amenity=charging_station]${around(400)};nwr[highway~"^(rest_area|services)$"]${around(550)};nwr[amenity=place_of_worship][religion=muslim]${around(650)};);out center tags 2000;`;
 try{
  const configured=env as unknown as Record<string,string|undefined>;
  const result=await providerJson(endpoint(configured.NAVIYA_OVERPASS_URL,'https://overpass.private.coffee/api/interpreter'),{service:'cameras',env:env as unknown as ProviderEnvironment,method:'POST',body:new URLSearchParams({data:query}),timeout:28000,ttl:3600000,validate:d=>!d.remark&&Array.isArray(d.elements)}) as any;
  return Response.json({available:true,stops:stopsAlongRoute(route,result.elements),source:'OpenStreetMap / Overpass',dataAsOf:result.osm3s?.timestamp_osm_base||null},{headers:{'Cache-Control':'private, max-age=600'}});
 }catch(error){return fail(error instanceof ServiceError&&error.status===429?'Stop search has reached its request allowance. Try again later.':'Stops along the route are temporarily unavailable.',error instanceof ServiceError?error.status:503)}
}
