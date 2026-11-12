import {segmentDistance,type Point} from './route-cameras.ts';

export type StopKind='petrol'|'ev'|'rest'|'surau';
export type RouteStop={id:string;kind:StopKind;name:string;lat:number;lon:number;along:number;offset:number;brand:string|null};

const metres=111195;
const flat=(p:Point,lat:number):[number,number]=>[p[0]*Math.cos(lat*Math.PI/180)*metres,p[1]*metres];

/** Cumulative distance in metres at each route vertex. */
export function cumulative(points:Point[]){const out=[0];for(let i=1;i<points.length;i++){const lat=points[i][1],a=flat(points[i-1],lat),b=flat(points[i],lat);out.push(out[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}return out}

/** Where a point sits along the route: distance from the start (m) and how far it is off the line (m). */
export function project(points:Point[],cum:number[],p:Point){
 let best={along:0,offset:Infinity,index:0};
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=segmentDistance(p,a,b);if(d<best.offset){const lat=p[1],A=flat(a,lat),B=flat(b,lat),P=flat(p,lat),dx=B[0]-A[0],dy=B[1]-A[1],len=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((P[0]-A[0])*dx+(P[1]-A[1])*dy)/len));best={along:cum[i-1]+t*(cum[i]-cum[i-1]),offset:d,index:i-1}}}
 return best;
}

export function kindOf(tags:Record<string,string>={}):StopKind|null{
 if(tags.amenity==='fuel')return 'petrol';
 if(tags.amenity==='charging_station')return 'ev';
 if(tags.highway==='rest_area'||tags.highway==='services')return 'rest';
 if(tags.amenity==='place_of_worship'&&tags.religion==='muslim')return 'surau';
 return null;
}
const corridor:Record<StopKind,number>={petrol:250,ev:250,rest:400,surau:500};
const fallbackName:Record<StopKind,string>={petrol:'Petrol station',ev:'EV charger',rest:'R&R / rest area',surau:'Surau / masjid'};

/** Stops from Overpass elements that sit within each kind's corridor, ordered by distance from the start, thinned on long routes. */
export function stopsAlongRoute(points:Point[],elements:any[],perKind=40):RouteStop[]{
 const cum=cumulative(points),total=cum[cum.length-1]||1,seen=new Set<string>(),out:RouteStop[]=[];
 for(const e of elements){
  const lat=Number(e?.lat??e?.center?.lat),lon=Number(e?.lon??e?.center?.lon),kind=kindOf(e?.tags),id=`${e?.type}${e?.id}`;
  if(!kind||!Number.isFinite(lat)||!Number.isFinite(lon)||seen.has(id))continue;seen.add(id);
  const pos=project(points,cum,[lon,lat]);if(pos.offset>corridor[kind])continue;
  const tags=e.tags||{},name=String(tags.name||tags['name:ms']||tags['name:en']||tags.brand||fallbackName[kind]).slice(0,80);
  out.push({id,kind,name,lat,lon,along:Math.round(pos.along),offset:Math.round(pos.offset),brand:typeof tags.brand==='string'?tags.brand.slice(0,40):null});
 }
 const result:RouteStop[]=[];
 for(const kind of ['rest','petrol','surau','ev'] as StopKind[]){
  const list=out.filter(s=>s.kind===kind).sort((a,b)=>a.along-b.along);
  if(list.length<=perKind){result.push(...list);continue}
  // Keep the closest-to-road stop in each equal stretch of the route.
  const bucket=total/perKind,keep=new Map<number,RouteStop>();
  for(const s of list){const k=Math.floor(s.along/bucket),cur=keep.get(k);if(!cur||s.offset<cur.offset)keep.set(k,s)}
  result.push(...keep.values());
 }
 return result.sort((a,b)=>a.along-b.along);
}
