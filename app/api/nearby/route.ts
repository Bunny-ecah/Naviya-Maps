import {env} from 'cloudflare:workers';
import {endpoint,serviceFailure,type ProviderEnvironment} from '../../../lib/provider-http';
import { queryPlaces, categoryTags, distanceKm } from '../../../lib/place-search';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,lat=Number(p.get('lat')),lon=Number(p.get('lon')),category=p.get('category')||'all',radius=Number(p.get('radius')||3);
 if(!p.has('lat')||!p.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<0||lat>8||lon<99||lon>120||!['1','3','5','10'].includes(String(radius))||(category!=='all'&&!Object.hasOwn(categoryTags,category)))return Response.json({error:'Choose a Malaysian location, a supported category and a radius of 1, 3, 5 or 10 km.'},{status:400});
 try{const url=new URL('reverse',endpoint((env as unknown as ProviderEnvironment).NAVIYA_PHOTON_URL,'https://photon.komoot.io/').href.replace(/\/?$/,'/'));url.search=new URLSearchParams({lat:String(lat),lon:String(lon),radius:String(radius),limit:'40',lang:'en'}).toString();
 const transit=['railway:station','railway:halt','highway:bus_stop','amenity:bus_station'],offices=['office','building:office'];const tags=category==='all'?[...new Set([...Object.values(categoryTags),...transit])]:category==='Transit'?transit:category==='Office'?offices:[categoryTags[category]];tags.forEach(tag=>url.searchParams.append('osm_tag',tag));
 const places=(await queryPlaces(url,env as unknown as ProviderEnvironment)).map(place=>({...place,distance:distanceKm(lat,lon,place.lat,place.lon)})).filter(place=>place.distance<=radius).sort((a,b)=>a.distance-b.distance);return Response.json({places,radius,source:'OpenStreetMap via Photon',attribution:'© OpenStreetMap contributors',distanceType:'straight-line'},{headers:{'Cache-Control':'private, max-age=300'}})}catch(error){return serviceFailure(error,'Nearby places are temporarily unavailable. Please retry shortly.')}
}
