import {readJson,ServiceError,type ProviderEnvironment} from '../../../lib/provider-http';
import {overpass} from '../../../lib/overpass';
import {env} from 'cloudflare:workers';
import {validCoordinate} from '../../../lib/road-routing';
import {simplify,camerasForRoute,type Point} from '../../../lib/route-cameras';
export const dynamic='force-dynamic';
const cache=new Map<string,{expires:number;data:unknown}>();

export async function POST(request:Request){
 const unavailable=(message:string,status=503)=>Response.json({error:message,available:false},{status,headers:{'Cache-Control':'no-store',...(status===429||status===503?{'Retry-After':'30'}:{})}});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return unavailable('This request must come from Naviya.',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return unavailable('JSON is required.',415);
 let routes:Point[][];let text:string;try{const data=await readJson(request,1500000);routes=data?.routes;text=JSON.stringify(data)}catch(error){return unavailable(error instanceof Error?error.message:'Invalid route data.',error instanceof ServiceError?error.status:400)}
 if(!Array.isArray(routes)||routes.length<1||routes.length>3||routes.some(r=>!Array.isArray(r)||r.length<2||r.length>20000||r.some(p=>!Array.isArray(p)||p.length!==2||!validCoordinate(p[1],p[0]))))return unavailable('Valid Malaysian route geometry is required.',400);
 const lines=routes.map(simplify);if(lines.some(r=>r.length>2500))return unavailable('Camera coverage cannot be checked for this complex route.',422);
 const query='[out:json][timeout:12];('+lines.map(r=>'node[highway=speed_camera](around:70,'+r.map(p=>p[1]+','+p[0]).join(',')+');').join('')+');out body;';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const hit=cache.get(key);if(hit&&hit.expires>Date.now())return Response.json(hit.data);
 try{
 const result=await overpass(query,env as unknown as ProviderEnvironment,{budgetMs:19000,validate:d=>d.elements.length<=2000&&Number.isFinite(Date.parse(d.osm3s?.timestamp_osm_base))}) as any;
 const data={available:true,routes:routes.map(r=>{const cameras=camerasForRoute(r,result.elements);return {count:cameras.length,cameras}}),source:'OpenStreetMap / Overpass',dataAsOf:result.osm3s.timestamp_osm_base,checkedAt:new Date().toISOString(),corridorMetres:50,coverage:'Mapped fixed cameras near the route. Direction and operation are unverified. Mobile traps and unmapped cameras are not included.'};
 if(cache.size>=40)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+3600000,data});return Response.json(data);
 }catch(error){return unavailable('Fixed-camera data is temporarily unavailable. The route remains usable.',error instanceof ServiceError?error.status:503)}
}
