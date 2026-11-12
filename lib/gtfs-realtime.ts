/**
 * Minimal GTFS Realtime decoder for VehiclePosition feeds (https://gtfs.org/realtime/reference/).
 * Only the fields Naviya shows are read; everything else is skipped by wire type, so newer feed
 * versions with extra fields still decode.
 */
export type Vehicle = {id:string;lat:number;lon:number;routeId:string;tripId:string;label:string;plate:string;bearing:number|null;speedKmh:number|null;timestamp:number|null};

class Reader {
 pos=0;buf:Uint8Array;end:number;
 constructor(buf:Uint8Array){this.buf=buf;this.end=buf.length}
 more(){return this.pos<this.end}
 varint(){let result=0,mult=1;for(let i=0;i<10;i++){if(this.pos>=this.end)throw new Error('Truncated varint');const b=this.buf[this.pos++];result+=(b&0x7f)*mult;if(b<0x80)return result;mult*=128}throw new Error('Varint too long')}
 bytes(){const len=this.varint();if(this.pos+len>this.end)throw new Error('Truncated field');const out=this.buf.subarray(this.pos,this.pos+len);this.pos+=len;return out}
 float(){if(this.pos+4>this.end)throw new Error('Truncated float');const v=new DataView(this.buf.buffer,this.buf.byteOffset+this.pos,4).getFloat32(0,true);this.pos+=4;return v}
 skip(wire:number){if(wire===0)this.varint();else if(wire===1)this.pos+=8;else if(wire===2)this.bytes();else if(wire===5)this.pos+=4;else throw new Error('Unsupported wire type '+wire);if(this.pos>this.end)throw new Error('Truncated field')}
 *fields(){while(this.more()){const tag=this.varint();yield {field:Math.floor(tag/8),wire:tag%8}}}
}
const text=new TextDecoder();
const str=(r:Reader)=>text.decode(r.bytes());

function readMessage(bytes:Uint8Array,onField:(r:Reader,field:number,wire:number)=>boolean){const r=new Reader(bytes);for(const {field,wire} of r.fields()){if(!onField(r,field,wire))r.skip(wire)}}

function decodeVehiclePosition(bytes:Uint8Array,entityId:string):Vehicle|null{
 const v:Vehicle={id:entityId,lat:NaN,lon:NaN,routeId:'',tripId:'',label:'',plate:'',bearing:null,speedKmh:null,timestamp:null};
 readMessage(bytes,(r,field,wire)=>{
  if(field===1&&wire===2){readMessage(r.bytes(),(t,f,w)=>{if(f===1&&w===2){v.tripId=str(t);return true}if(f===5&&w===2){v.routeId=str(t);return true}return false});return true}
  if(field===2&&wire===2){readMessage(r.bytes(),(p,f,w)=>{if(w!==5)return false;const x=p.float();if(f===1)v.lat=x;else if(f===2)v.lon=x;else if(f===3)v.bearing=x;else if(f===5)v.speedKmh=Math.round(x*3.6);return true});return true}
  if(field===5&&wire===0){v.timestamp=r.varint();return true}
  if(field===8&&wire===2){readMessage(r.bytes(),(d,f,w)=>{if(w!==2)return false;const s=str(d);if(f===1)v.id=s||v.id;else if(f===2)v.label=s;else if(f===3)v.plate=s;return true});return true}
  return false;
 });
 return Number.isFinite(v.lat)&&Number.isFinite(v.lon)?v:null;
}

/** Decodes a FeedMessage and returns its vehicle positions plus the feed header timestamp (seconds). */
export function decodeVehicleFeed(input:ArrayBuffer|Uint8Array){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 const vehicles:Vehicle[]=[];let feedTimestamp:number|null=null;
 readMessage(bytes,(r,field,wire)=>{
  if(field===1&&wire===2){readMessage(r.bytes(),(h,f,w)=>{if(f===3&&w===0){feedTimestamp=h.varint();return true}return false});return true}
  if(field===2&&wire===2){let id='',vp:Uint8Array|null=null;readMessage(r.bytes(),(e,f,w)=>{if(f===1&&w===2){id=str(e);return true}if(f===4&&w===2){vp=e.bytes().slice();return true}return false});if(vp){const v=decodeVehiclePosition(vp,id);if(v)vehicles.push(v)}return true}
  return false;
 });
 return {feedTimestamp,vehicles};
}

/** Official data.gov.my feeds, with the area each one serves (lat/lon box) so only relevant feeds are queried. */
export const transitFeeds=[
 {id:'ktmb',name:'KTM',kind:'train',path:'ktmb',box:[1.2,99.6,6.8,104.4]},
 {id:'rapid-bus-kl',name:'Rapid KL bus',kind:'bus',path:'prasarana?category=rapid-bus-kl',box:[2.7,101.3,3.5,102.0]},
 {id:'rapid-bus-mrtfeeder',name:'MRT feeder bus',kind:'bus',path:'prasarana?category=rapid-bus-mrtfeeder',box:[2.7,101.3,3.5,102.0]},
 {id:'rapid-bus-penang',name:'Rapid Penang',kind:'bus',path:'prasarana?category=rapid-bus-penang',box:[5.1,100.1,5.6,100.6]},
 {id:'mybas-johor',name:'BAS.MY Johor Bahru',kind:'bus',path:'mybas-johor',box:[1.25,103.4,1.8,104.2]},
 {id:'mybas-melaka',name:'BAS.MY Melaka',kind:'bus',path:'mybas-melaka',box:[2.0,102.0,2.5,102.6]},
 {id:'mybas-seremban-a',name:'BAS.MY Seremban',kind:'bus',path:'mybas-seremban-a',box:[2.5,101.7,2.9,102.1]},
 {id:'mybas-seremban-b',name:'BAS.MY Seremban',kind:'bus',path:'mybas-seremban-b',box:[2.5,101.7,2.9,102.1]},
 {id:'mybas-ipoh',name:'BAS.MY Ipoh',kind:'bus',path:'mybas-ipoh',box:[4.4,100.9,4.8,101.3]},
 {id:'mybas-kangar',name:'BAS.MY Kangar',kind:'bus',path:'mybas-kangar',box:[6.2,100.1,6.7,100.4]},
 {id:'mybas-alor-setar',name:'BAS.MY Alor Setar',kind:'bus',path:'mybas-alor-setar',box:[5.9,100.2,6.3,100.6]},
 {id:'mybas-kota-bharu',name:'BAS.MY Kota Bharu',kind:'bus',path:'mybas-kota-bharu',box:[5.8,102.1,6.3,102.5]},
 {id:'mybas-kuala-terengganu',name:'BAS.MY Kuala Terengganu',kind:'bus',path:'mybas-kuala-terengganu',box:[5.1,102.9,5.5,103.3]},
 {id:'mybas-kuching',name:'BAS.MY Kuching',kind:'bus',path:'mybas-kuching',box:[1.3,110.1,1.8,110.6]},
] as const;

/** Feeds whose service area is within `padKm` of the point. */
export function feedsNear(lat:number,lon:number,padKm=10){const pad=padKm/111;return transitFeeds.filter(f=>lat>=f.box[0]-pad&&lat<=f.box[2]+pad&&lon>=f.box[1]-pad&&lon<=f.box[3]+pad)}
