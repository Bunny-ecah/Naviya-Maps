import {env} from 'cloudflare:workers';
import {providerJson,endpoint,type ProviderEnvironment} from '../../../lib/provider-http';
import {decodeVehicleFeed,feedsNear} from '../../../lib/gtfs-realtime';
import {distanceKm} from '../../../lib/place-search';
export const dynamic='force-dynamic';

/**
 * Live bus and train positions near a point, from the official data.gov.my GTFS Realtime feeds
 * (Prasarana, BAS.MY and KTMB). Positions only: these feeds carry no arrival predictions or fares.
 */
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,lat=Number(p.get('lat')),lon=Number(p.get('lon')),radius=Number(p.get('radius')||3);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<0||lat>8||lon<99||lon>120||!(radius>=0.5&&radius<=10))return Response.json({error:'Choose a Malaysian location and a radius between 0.5 and 10 km.'},{status:400});
 const feeds=feedsNear(lat,lon).slice(0,4);
 if(!feeds.length)return Response.json({available:true,covered:false,vehicles:[],feeds:[],source:'data.gov.my GTFS Realtime'},{headers:{'Cache-Control':'private, max-age=30'}});
 const configured=env as unknown as Record<string,string|undefined>;
 const base=endpoint(configured.NAVIYA_GTFS_RT_URL,'https://api.data.gov.my/gtfs-realtime/vehicle-position/').href.replace(/\/?$/,'/');
 const now=Math.floor(Date.now()/1000);
 const results=await Promise.allSettled(feeds.map(async feed=>{
  const bytes=await providerJson(new URL(feed.path,base),{service:'transit',env:env as unknown as ProviderEnvironment,timeout:10000,ttl:25000,binary:true}) as Uint8Array;
  const {feedTimestamp,vehicles}=decodeVehicleFeed(bytes);
  return {feed,feedTimestamp,vehicles};
 }));
 const status=results.map((r,i)=>({id:feeds[i].id,name:feeds[i].name,kind:feeds[i].kind,ok:r.status==='fulfilled',updated:r.status==='fulfilled'?r.value.feedTimestamp:null}));
 if(results.every(r=>r.status==='rejected'))return Response.json({available:false,error:'Live transit positions are temporarily unavailable. Please retry shortly.',feeds:status},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'30'}});
 const vehicles=results.flatMap(r=>r.status==='fulfilled'?r.value.vehicles.map(v=>({...v,feed:r.value.feed.name,kind:r.value.feed.kind,distance:distanceKm(lat,lon,v.lat,v.lon),ageSeconds:v.timestamp?Math.max(0,now-v.timestamp):null})):[])
  // Positions older than 10 minutes are stale (vehicle likely out of service) and are not shown as live.
  .filter(v=>v.distance<=radius&&(v.ageSeconds===null||v.ageSeconds<=600))
  .sort((a,b)=>a.distance-b.distance).slice(0,60);
 return Response.json({available:true,covered:true,vehicles,feeds:status,radius,source:'data.gov.my GTFS Realtime',attribution:'Data: data.gov.my (Prasarana, BAS.MY, KTMB)',predictions:false},{headers:{'Cache-Control':'private, max-age=20'}});
}
