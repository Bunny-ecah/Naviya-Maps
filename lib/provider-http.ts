export type ProviderEnvironment = {DB?:D1Database;[key:string]:unknown};
export class ServiceError extends Error {status:number;retryAfter:number;constructor(message:string,status=503,retryAfter=15){super(message);this.status=status;this.retryAfter=retryAfter}}
export function endpoint(value:unknown,fallback:string){const url=new URL(typeof value==='string'&&value?value:fallback);if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new Error('Provider endpoints must use HTTPS without embedded credentials.');return url}
const cache=new Map<string,{expires:number;data:unknown;bytes:number}>(),pending=new Map<string,Promise<unknown>>(),cooldown=new Map<string,number>();let cacheBytes=0;
const limits={places:{minute:60,day:4000},routing:{minute:30,day:1000},cameras:{minute:6,day:100}};
async function budget(env:ProviderEnvironment,service:keyof typeof limits){
 if(!env.DB)return;
 const now=Date.now(),windows=[{name:'minute',size:60000,limit:limits[service].minute},{name:'day',size:86400000,limit:limits[service].day}];
 for(const w of windows){const start=Math.floor(now/w.size)*w.size,key=`${service}:${w.name}:${start}`;
 const result=await env.DB.prepare('INSERT INTO service_usage (bucket, requests, expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET requests=requests+1 WHERE requests < ? RETURNING requests').bind(key,start+w.size,w.limit).first();
 if(!result)throw new ServiceError('This service has reached its shared request allowance. Please try again later.',429,Math.ceil((start+w.size-now)/1000));}
 await env.DB.prepare('DELETE FROM service_usage WHERE expires < ?').bind(now).run();
}
export async function providerJson(url:URL,options:{service:keyof typeof limits;env?:ProviderEnvironment;timeout?:number;ttl?:number;method?:string;body?:URLSearchParams;validate?:(data:any)=>boolean}){
 const key=options.service+':'+url.toString()+':'+(options.body?.toString()||'');const hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.data;
 const existing=pending.get(key);if(existing)return existing;
 const host=url.origin;if((cooldown.get(host)||0)>Date.now())throw new ServiceError('The data provider is temporarily busy. Please retry shortly.',503,Math.ceil((cooldown.get(host)!-Date.now())/1000));
 const task=(async()=>{await budget(options.env||{},options.service);let response:Response;
 try{response=await fetch(url,{method:options.method||'GET',body:options.body,headers:{Accept:'application/json','User-Agent':'Naviya/1.2 (+https://laluan-malaysia-journey.nursyahkinah00.chatgpt.site)',...(options.body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},signal:AbortSignal.timeout(options.timeout||10000)})}catch{cooldown.set(host,Date.now()+15000);throw new ServiceError('The data provider could not be reached. Please retry shortly.')}
 if(!response.ok){const retry=Math.min(300,Math.max(15,Number(response.headers.get('Retry-After'))||30));if(response.status===429||response.status>=500)cooldown.set(host,Date.now()+retry*1000);throw new ServiceError('The data provider is temporarily unavailable.',503,retry)}
 let data:any;try{data=await response.json()}catch{throw new ServiceError('The data provider returned an invalid response.')}
 if(!data||typeof data!=='object'||data.remark||options.validate&&!options.validate(data))throw new ServiceError('The data provider returned incomplete results. Please retry.');
 const bytes=2*(key.length+JSON.stringify(data).length);if(bytes<=1000000){const old=cache.get(key);if(old){cacheBytes-=old.bytes;cache.delete(key)}while(cache.size&&(cache.size>=100||cacheBytes+bytes>8000000)){const oldest=cache.keys().next().value!;cacheBytes-=cache.get(oldest)!.bytes;cache.delete(oldest)}cache.set(key,{expires:Date.now()+(options.ttl||300000),data,bytes});cacheBytes+=bytes}return data;
 })();pending.set(key,task);try{return await task}finally{pending.delete(key)}
}
export function serviceFailure(error:unknown,message:string){return Response.json({error:message},{status:error instanceof ServiceError?error.status:503,headers:{'Cache-Control':'no-store','Retry-After':String(error instanceof ServiceError?error.retryAfter:15)}})}
export async function readJson(request:Request,maxBytes=8192){
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))throw new ServiceError('JSON is required.',415,0);
 const reader=request.body?.getReader();if(!reader)throw new ServiceError('A request body is required.',400,0);const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new ServiceError('Request is too large.',413,0)}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new ServiceError('Invalid JSON.',400,0)}
}
