import {providerJson,endpoint,ServiceError,type ProviderEnvironment} from './provider-http.ts';

/** Public Overpass servers are often at capacity, so a query tries the next server instead of failing. */
const PUBLIC_SERVERS=['https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];

export async function overpass(query:string,env:ProviderEnvironment,{budgetMs=25000,validate}:{budgetMs?:number;validate?:(d:any)=>boolean}={}){
 const configured=typeof env.NAVIYA_OVERPASS_URL==='string'&&env.NAVIYA_OVERPASS_URL?[env.NAVIYA_OVERPASS_URL]:[];
 const servers=[...new Set([...configured,...PUBLIC_SERVERS])];
 const deadline=Date.now()+budgetMs;let last:unknown=new ServiceError('Map data servers are busy. Please retry shortly.');
 for(const server of servers){
  const left=deadline-Date.now();if(left<3000)break;
  try{return await providerJson(endpoint(server,server),{service:'cameras',env,method:'POST',body:new URLSearchParams({data:query}),timeout:Math.min(left,configured.length&&server===configured[0]?left:Math.max(8000,left/2)),ttl:3600000,validate:d=>!d.remark&&Array.isArray(d.elements)&&(!validate||validate(d))})}
  catch(error){last=error;if(error instanceof ServiceError&&error.status===429&&/allowance/.test(error.message))throw error}
 }
 throw last;
}
