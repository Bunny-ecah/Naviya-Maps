import {env} from 'cloudflare:workers';
import {endpoint,serviceFailure,type ProviderEnvironment} from '../../../lib/provider-http';
import { queryPlaces, rankPlaces } from '../../../lib/place-search';
export const dynamic='force-dynamic';
const kinds=['all','buildings','areas','addresses','places','malls'];
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,q=p.get('q')?.trim()||'',kind=p.get('kind')||'all';
 if(q.length<2||q.length>120||!kinds.includes(kind))return Response.json({error:'Enter 2–120 characters and choose a supported search type.'},{status:400});
 try{const url=new URL('api/',endpoint((env as unknown as ProviderEnvironment).NAVIYA_PHOTON_URL,'https://photon.komoot.io/').href.replace(/\/?$/,'/'));url.search=new URLSearchParams({q,limit:'40',lang:'en',countrycode:'MY'}).toString();
 const lat=Number(p.get('lat')),lon=Number(p.get('lon'));if(p.has('lat')&&p.has('lon')&&Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=0&&lat<=8&&lon>=99&&lon<=120){url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lon));url.searchParams.set('zoom','10');url.searchParams.set('location_bias_scale','0.2')}
 if(kind==='buildings'){url.searchParams.append('osm_tag','building');url.searchParams.append('osm_tag','office')}
 if(kind==='areas')for(const layer of ['city','district','locality','state','county'])url.searchParams.append('layer',layer);
 if(kind==='addresses')for(const layer of ['street','house'])url.searchParams.append('layer',layer);
 if(kind==='malls')url.searchParams.append('osm_tag','shop:mall');
 if(kind==='places')for(const tag of ['amenity','shop','tourism','leisure','railway:station'])url.searchParams.append('osm_tag',tag);
 const main=queryPlaces(url,env as unknown as ProviderEnvironment);let extra:Promise<import('../../../lib/place-search').Place[]>=Promise.resolve([]);if(kind==='all'&&(q.length<=4||/\b(mall|shopping)\b/i.test(q))){const focused=new URL(url);focused.searchParams.set('limit','15');focused.searchParams.append('osm_tag','shop:mall');extra=queryPlaces(focused,env as unknown as ProviderEnvironment).catch(()=>[])}const [general,malls]=await Promise.all([main,extra]);let places=[...new Map([...general,...malls].map(p=>[p.id,p])).values()];
 if(kind==='buildings')places=places.filter(place=>['building','office'].includes(place.category||''));
 if(kind==='areas')places=places.filter(place=>place.category==='area');
 const results=rankPlaces(places,q,kind).slice(0,24);return Response.json({places:results,kind,source:'OpenStreetMap via Photon',attribution:'© OpenStreetMap contributors',coverage:'Mapped records, not an exhaustive national building registry.'},{headers:{'Cache-Control':'private, max-age=300'}})
 }catch(error){return serviceFailure(error,'Place search is temporarily unavailable. Please retry shortly.')}
}
