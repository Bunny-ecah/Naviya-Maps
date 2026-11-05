import { queryPlaces, rankPlaces } from '../../../lib/place-search';
export const dynamic='force-dynamic';
const kinds=['all','buildings','areas','addresses','places'];
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,q=p.get('q')?.trim()||'',kind=p.get('kind')||'all';
 if(q.length<2||q.length>120||!kinds.includes(kind))return Response.json({error:'Enter 2–120 characters and choose a supported search type.'},{status:400});
 const url=new URL('https://photon.komoot.io/api/');url.search=new URLSearchParams({q,limit:'40',lang:'en',countrycode:'MY'}).toString();
 const lat=Number(p.get('lat')),lon=Number(p.get('lon'));if(p.has('lat')&&p.has('lon')&&Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=0&&lat<=8&&lon>=99&&lon<=120){url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lon));url.searchParams.set('zoom','10');url.searchParams.set('location_bias_scale','0.2')}
 if(kind==='buildings'){url.searchParams.append('osm_tag','building');url.searchParams.append('osm_tag','office')}
 if(kind==='areas')for(const layer of ['city','district','locality','state','county'])url.searchParams.append('layer',layer);
 if(kind==='addresses')for(const layer of ['street','house'])url.searchParams.append('layer',layer);
 if(kind==='places')for(const tag of ['amenity','shop','tourism','leisure','railway:station'])url.searchParams.append('osm_tag',tag);
 try{let places=await queryPlaces(url);if(kind==='all'&&q.length>=3){const enriched=new URL(url);enriched.searchParams.set('limit','20');for(const tag of ['place','building','office','shop:mall'])enriched.searchParams.append('osm_tag',tag);try{const extra=await queryPlaces(enriched);places=[...new Map([...places,...extra].map(place=>[place.id,place])).values()]}catch{/* Retain successful general results if enrichment is unavailable. */}}
 if(kind==='buildings')places=places.filter(place=>['building','office'].includes(place.category||''));
 if(kind==='areas')places=places.filter(place=>place.category==='area');
 const results=rankPlaces(places,q,kind).slice(0,24);return Response.json({places:results,kind,source:'OpenStreetMap via Photon',attribution:'© OpenStreetMap contributors',coverage:'Mapped records, not an exhaustive national building registry.'},{headers:{'Cache-Control':'private, max-age=300'}})
 }catch{return Response.json({error:'Place search is temporarily unavailable. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
