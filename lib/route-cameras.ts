export type Point = [number, number];
const metres = 111195;
export function segmentDistance(p:Point,a:Point,b:Point){
 const scale=Math.cos(p[1]*Math.PI/180),x=(b[0]-a[0])*scale*metres,y=(b[1]-a[1])*metres,px=(p[0]-a[0])*scale*metres,py=(p[1]-a[1])*metres;
 const t=Math.max(0,Math.min(1,(px*x+py*y)/(x*x+y*y||1)));
 return Math.hypot(px-t*x,py-t*y);
}
// Iterative Douglas–Peucker: the query corridor includes the maximum 15 m simplification error.
export function simplify(points:Point[]){
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];
 while(stack.length){const [a,b]=stack.pop()!;let max=15,index=-1;for(let i=a+1;i<b;i++){const d=segmentDistance(points[i],points[a],points[b]);if(d>max){max=d;index=i}}
 if(index>=0){keep.add(index);stack.push([a,index],[index,b])}}
 return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}
export function camerasForRoute(points:Point[],elements:any[]){
 const seen=new Set<number>();
 return elements.filter(n=>{
 if(n.type!=='node'||!Number.isSafeInteger(n.id)||seen.has(n.id)||n.tags?.highway!=='speed_camera'||!Number.isFinite(n.lat)||!Number.isFinite(n.lon))return false;
 seen.add(n.id);return points.slice(1).some((b,i)=>segmentDistance([n.lon,n.lat],points[i],b)<=50);
 }).map(n=>({id:n.id,lat:n.lat,lon:n.lon,name:typeof n.tags.name==='string'?n.tags.name:'Mapped fixed speed camera',maxspeed:typeof n.tags.maxspeed==='string'?n.tags.maxspeed:null}));
}
