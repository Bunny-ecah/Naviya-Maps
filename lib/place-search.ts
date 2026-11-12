import {providerJson,type ProviderEnvironment} from './provider-http.ts';
export type Place={id:string;name:string;address:string;type:string;lat:number;lon:number;distance?:number;category?:string;osmKey?:string;osmValue?:string;layer?:string};
export const categoryTags:Record<string,string>={Restaurant:'amenity:restaurant',Cafe:'amenity:cafe',Hotel:'tourism:hotel',Museum:'tourism:museum','Things to do':'tourism:attraction',Transit:'railway:station',Pharmacy:'amenity:pharmacy',ATM:'amenity:atm',Mall:'shop:mall',Petrol:'amenity:fuel','EV charging':'amenity:charging_station','Rest stop':'highway:rest_area',Hospital:'amenity:hospital',Parking:'amenity:parking',Surau:'amenity:place_of_worship',Office:'office',Building:'building',School:'amenity:school',University:'amenity:university'};
export function classify(p:Record<string,unknown>){const k=String(p.osm_key||''),v=String(p.osm_value||''),layer=String(p.type||'');if(k==='office')return {type:'Office',category:'office'};if(k==='building')return {type:v==='office'?'Office building':v==='commercial'?'Commercial building':v==='apartments'?'Apartments':v==='residential'?'Residential building':'Building',category:'building'};if(['city','town','village','suburb','quarter','neighbourhood','state','county','district','municipality','locality'].includes(v)||['city','district','state','county','locality'].includes(layer))return {type:v==='city'?'City':v==='town'?'Town':v==='state'?'State':'Area',category:'area'};if((k==='highway'&&!['bus_stop','rest_area','services'].includes(v))||layer==='street'&&v!=='bus_stop')return {type:'Street',category:'address'};if(layer==='house'&&!p.name)return {type:'Address',category:'address'};return {type:({mall:'Mall',restaurant:'Restaurant',cafe:'Cafe',hotel:'Hotel',museum:'Museum',station:'Transit',halt:'Transit',bus_stop:'Transit',bus_station:'Transit',tram_stop:'Transit',hospital:'Hospital',parking:'Parking',place_of_worship:'Surau',pharmacy:'Pharmacy',atm:'ATM',fuel:'Petrol',charging_station:'EV charging',park:'Park',rest_area:'Rest stop',services:'Rest stop',attraction:'Things to do',food_court:'Food court',school:'School',university:'University'} as Record<string,string>)[v]||v.replaceAll('_',' ')||'Place',category:'place'}}
export function normalize(features:any[]):Place[]{const seen=new Set<string>();return features.flatMap(f=>{const p=f?.properties,c=f?.geometry?.coordinates;if(!p||!Array.isArray(c)||!Number.isFinite(c[0])||!Number.isFinite(c[1])||c[0]<99||c[0]>120||c[1]<0||c[1]>8||String(p.countrycode).toUpperCase()!=='MY')return [];const name=String(p.name||[p.housenumber,p.street].filter(Boolean).join(' ')||p.city||'Unnamed place'),address=[p.housenumber,p.street,p.locality,p.district,p.city,p.state,p.postcode].filter((x,i,a)=>x&&a.indexOf(x)===i).join(', ');const key=name.toLowerCase()+':'+Math.round(c[0]*1000)+':'+Math.round(c[1]*1000);if(seen.has(key))return [];seen.add(key);return [{id:`${p.osm_type}${p.osm_id}`,name,address:address||'Malaysia',...classify(p),osmKey:String(p.osm_key||''),osmValue:String(p.osm_value||''),layer:String(p.type||''),lon:c[0],lat:c[1]}]})}
const fold=(v:string)=>v.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'');
const tokens=(v:string)=>fold(v).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
/** How well a place NAME matches the typed text: exact 150, starts with / whole word 24, all words present 18, contains 12, some words 6. */
export function nameScore(p:Place,query:string){
 const q=fold(query).trim(),n=fold(p.name),words=tokens(p.name),qWords=tokens(query);
 if(!q)return 0;if(n===q)return 150;if(n.startsWith(q)||words.includes(q))return 24;
 if(qWords.length>1&&qWords.every(w=>words.some(x=>x.startsWith(w))))return 18;
 if(n.includes(q))return 12;
 const address=fold(p.address||'');
 if(qWords.length>1&&qWords.every(w=>words.some(x=>x.startsWith(w))||address.includes(w)))return 8;
 return qWords.some(w=>w.length>=3&&words.some(x=>x.startsWith(w)))?6:0;
}
export function rankPlaces(places:Place[],query:string,kind='all'){
 const buildingIntent=/\b(menara|wisma|bangunan|tower|office|pejabat|building)\b/i.test(query),mallIntent=/\b(mall|shopping)\b/i.test(query);
 const score=(p:Place)=>{let s=nameScore(p,query);
  if(p.category==='area')s+=8;
  if(p.type==='Mall')s+=mallIntent?155:45;
  if(['building','office'].includes(p.category||''))s+=buildingIntent||kind==='buildings'?45:14;
  if(p.category==='address')s+=kind==='addresses'?35:0;
  if(p.type==='Transit')s+=8;
  // Closer places win ties; far ones (other states) drop but are not removed.
  if(Number.isFinite(p.distance))s-=Math.min(40,Math.sqrt(p.distance!)*3);
  return s};
 return [...places].sort((a,b)=>score(b)-score(a));
}
export async function queryPlaces(url:URL,context:ProviderEnvironment={}):Promise<Place[]>{const data=await providerJson(url,{service:'places',env:context,ttl:3600000,validate:d=>Array.isArray(d.features)}) as {features:any[]};return normalize(data.features)}
export function distanceKm(a:number,b:number,c:number,d:number){const rad=Math.PI/180,x=Math.sin((c-a)*rad/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
