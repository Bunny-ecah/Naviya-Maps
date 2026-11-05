import {env} from 'cloudflare:workers';
import {validCoordinate} from '../../../lib/road-routing';
import {simplify,camerasForRoute,type Point} from '../../../lib/route-cameras';
export const dynamic='force-dynamic';
const cache=new Map<string,{expires:number;data:unknown}>();
let busy=false,nextRequest=0;
export async function POST(request:Request){
 const unavailable=(message:string,status=503)=>Response.json({error:message,available:false},{status,headers:{'Cache-Control':'no-store'}});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return unavailable('This request must come from Naviya.',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return unavailable('JSON is required.',415);
 const reader=request.body?.getReader();if(!reader)return unavailable('Route data is required.',400);
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1500000){await reader.cancel();return unavailable('Route geometry is too large.',413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}const text=new TextDecoder().decode(bytes);
 let routes:Point[][];try{routes=JSON.parse(text).routes}catch{return unavailable('Invalid route data.',400)}
 if(!Array.isArray(routes)||routes.length<1||routes.length>3||routes.some(r=>!Array.isArray(r)||r.length<2||r.length>20000||r.some(p=>!Array.isArray(p)||p.length!==2||!validCoordinate(p[1],p[0]))))return unavailable('Valid Malaysian route geometry is required.',400);
 const lines=routes.map(simplify);if(lines.some(r=>r.length>2500))return unavailable('Camera coverage cannot be checked for this complex route.',422);
 const query='[out:json][timeout:12];('+lines.map(r=>'node[highway=speed_camera](around:70,'+r.map(p=>p[1]+','+p[0]).join(',')+');').join('')+');out body;';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const hit=cache.get(key);if(hit&&hit.expires>Date.now())return Response.json(hit.data);
 if(busy||Date.now()<nextRequest)return unavailable('Camera service is busy. Try again shortly.',429);
 busy=true;nextRequest=Date.now()+5000;
 try{
 const configured=env as unknown as Record<string,string|undefined>;
 const response=await fetch(configured.NAVIYA_OVERPASS_URL||'https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error();const result=await response.json() as any;
 // Overpass can return HTTP 200 with partial results and a timeout remark: never count those.
 if(result.remark||!Array.isArray(result.elements)||result.elements.length>10000||!result.osm3s?.timestamp_osm_base)throw Error();
 const data={available:true,routes:routes.map(r=>{const cameras=camerasForRoute(r,result.elements);return {count:cameras.length,cameras}}),source:'OpenStreetMap / Overpass',dataAsOf:result.osm3s.timestamp_osm_base,checkedAt:new Date().toISOString(),corridorMetres:50,coverage:'Mapped fixed cameras near the route. Direction and operation are unverified. Mobile traps and unmapped cameras are not included.'};
 if(cache.size>=40)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+3600000,data});return Response.json(data);
 }catch{return unavailable('Fixed-camera data is temporarily unavailable. The route remains usable.')}finally{busy=false}
}
