import {env} from 'cloudflare:workers';
import {endpoint,serviceFailure,ServiceError,type ProviderEnvironment} from '../../../lib/provider-http';
import {queryPlaces,rankPlaces,distanceKm,nameScore,type Place} from '../../../lib/place-search';
import {parseIntent,expandQuery,searchCategories,type Intent} from '../../../lib/search-intent';
export const dynamic='force-dynamic';
const kinds=['all','buildings','areas','addresses','places','malls'];
type Center={name:string;lat:number;lon:number};

export async function GET(request:Request){
 const p=new URL(request.url).searchParams,q=p.get('q')?.trim()||'',kind=p.get('kind')||'all';
 if(q.length<2||q.length>120||!kinds.includes(kind))return Response.json({error:'Type at least 2 letters to search.'},{status:400});
 const environment=env as unknown as ProviderEnvironment;
 const base=endpoint(environment.NAVIYA_PHOTON_URL,'https://photon.komoot.io/').href.replace(/\/?$/,'/');
 const lat=Number(p.get('lat')),lon=Number(p.get('lon'));
 const bias:Center|null=p.has('lat')&&p.has('lon')&&Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=0&&lat<=8&&lon>=99&&lon<=120?{name:(p.get('near')||'your area').slice(0,80),lat,lon}:null;
 const text=expandQuery(q);

 // What the visitor means: a kind of place ("mall", "klinik dekat PJ") or a name/address ("Sunway Pyramid").
 let intent:Intent|null=['all','places','malls'].includes(kind)?parseIntent(q):null;
 if(kind==='malls'&&(!intent||intent.key!=='Mall')){const mall=searchCategories.find(c=>c.key==='Mall')!;intent={key:'Mall',label:mall.label,tags:mall.tags,placeText:text,nearMe:false}}

 const search=(query:string,limit:number,extra:(u:URL)=>void=()=>{},useBias=true)=>{const url=new URL('api/',base);url.search=new URLSearchParams({q:query,limit:String(limit),lang:'en',countrycode:'MY'}).toString();if(useBias&&bias){url.searchParams.set('lat',String(bias.lat));url.searchParams.set('lon',String(bias.lon));url.searchParams.set('zoom','10');url.searchParams.set('location_bias_scale','0.2')}extra(url);return queryPlaces(url,environment)};
 const around=(center:Center,tags:string[],radius:number)=>{const url=new URL('reverse',base);url.search=new URLSearchParams({lat:String(center.lat),lon:String(center.lon),radius:String(radius),limit:'50',lang:'en'}).toString();tags.forEach(t=>url.searchParams.append('osm_tag',t));return queryPlaces(url,environment).then(list=>list.map(x=>({...x,distance:distanceKm(center.lat,center.lon,x.lat,x.lon)})).filter(x=>x.distance<=radius).sort((a,b)=>a.distance-b.distance))};

let providerError:unknown=null;
 try{
  // 1. Name / address search (always runs, so real names like "Masjid Jamek" still come first).
  const named=search(text,40,url=>{
   if(kind==='buildings'){url.searchParams.append('osm_tag','building');url.searchParams.append('osm_tag','office')}
   if(kind==='areas')for(const layer of ['city','district','locality','state','county'])url.searchParams.append('layer',layer);
   if(kind==='addresses')for(const layer of ['street','house'])url.searchParams.append('layer',layer);
   if(kind==='malls')url.searchParams.append('osm_tag','shop:mall');
   if(kind==='places')for(const tag of ['amenity','shop','tourism','leisure','railway:station'])url.searchParams.append('osm_tag',tag);
  }).catch(e=>{if(!intent)throw e;providerError=e;return [] as Place[]});
  const shortMall=kind==='all'&&!intent&&q.length<=4?search(text,15,u=>u.searchParams.append('osm_tag','shop:mall')).catch(()=>[] as Place[]):Promise.resolve([] as Place[]);

  // 2. Category search: nearest places of that kind around the named place, the visitor, or the area on screen.
  let center:Center|null=null,categoryResults:Place[]=[];
  if(intent){
   if(intent.placeText){
    const candidates=await search(intent.placeText,8).catch(()=>[] as Place[]);
    const best=rankPlaces(candidates,intent.placeText).find(x=>nameScore(x,intent!.placeText)>0)||null;
    if(best)center={name:best.name,lat:best.lat,lon:best.lon};
   }else if(bias)center=bias;
   if(center){
    const wide=intent.placeText&&/state|negeri/i.test(intent.placeText)?10:5;
    categoryResults=await around(center,intent.tags,wide).catch(e=>{providerError=e;return [] as Place[]});
    if(categoryResults.length<5&&wide<10)categoryResults=await around(center,intent.tags,10).catch(()=>categoryResults);
   }else{
    // No location known: show places of this kind across Malaysia whose name mentions it.
    const word=searchCategories.find(c=>c.key===intent!.key)!.words[0];
    categoryResults=await search(word,30,u=>intent!.tags.forEach(t=>u.searchParams.append('osm_tag',t)),false).catch(()=>[] as Place[]);
   }
  }
  const [general,malls]=await Promise.all([named,shortMall]);
  let places=[...new Map([...general,...malls].map(x=>[x.id,x])).values()];
  if(kind==='buildings')places=places.filter(x=>['building','office'].includes(x.category||''));
  if(kind==='areas')places=places.filter(x=>x.category==='area');
  const from=center||bias;
  if(from)places=places.map(x=>({...x,distance:x.distance??distanceKm(from.lat,from.lon,x.lat,x.lon)}));
  let results:Place[];
  if(intent){
   // Exact-name hits first (e.g. "Masjid Jamek"), then the nearest places of the requested kind, then other matches.
   const strong=rankPlaces(places,text).filter(x=>nameScore(x,text)>=24).slice(0,3);
   const rest=rankPlaces(places,text).filter(x=>nameScore(x,text)>0);
   results=[...new Map([...strong,...categoryResults,...rest].map(x=>[x.id,x])).values()].slice(0,24);
  }else results=rankPlaces(places,text,kind).slice(0,24);
  if(!results.length&&providerError)throw providerError instanceof ServiceError?providerError:new ServiceError('Place search is temporarily unavailable. Please retry shortly.');
  return Response.json({places:results,kind,query:text,intent:intent?{key:intent.key,label:intent.label,near:center?.name||null,nearMe:intent.nearMe,nationwide:!center,placeText:intent.placeText||null}:null,source:'OpenStreetMap via Photon',attribution:'© OpenStreetMap contributors',coverage:'Mapped records, not an exhaustive national building registry.'},{headers:{'Cache-Control':'private, max-age=300'}});
 }catch(error){return serviceFailure(error,'Place search is temporarily unavailable. Please retry shortly.')}
}
