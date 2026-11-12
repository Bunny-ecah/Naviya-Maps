import {env} from 'cloudflare:workers';
import {providerJson,serviceFailure,type ProviderEnvironment} from '../../../lib/provider-http';
export const dynamic='force-dynamic';

/** Latest official weekly pump prices (RM per litre) from data.gov.my's fuelprice dataset. */
export async function GET(){
 try{
  const url=new URL('https://api.data.gov.my/data-catalogue');
  url.search=new URLSearchParams({id:'fuelprice',filter:'level@series_type',sort:'-date',limit:'1'}).toString();
  const data=await providerJson(url,{service:'places',env:env as unknown as ProviderEnvironment,timeout:10000,ttl:6*3600000,validate:d=>Array.isArray(d)?d.length>0:Array.isArray(d?.data)&&d.data.length>0}) as any;
  const row=Array.isArray(data)?data[0]:data.data[0];
  const price=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)&&n>0&&n<20?Math.round(n*100)/100:null};
  const prices=[
   {id:'ron95',label:'RON95',price:price(row.ron95)},
   {id:'ron95_budi95',label:'RON95 (BUDI95)',price:price(row.ron95_budi95)},
   {id:'ron97',label:'RON97',price:price(row.ron97)},
   {id:'diesel',label:'Diesel (Peninsular)',price:price(row.diesel)},
   {id:'diesel_eastmsia',label:'Diesel (Sabah, Sarawak, Labuan)',price:price(row.diesel_eastmsia)},
  ].filter(p=>p.price!==null);
  if(!prices.length)throw new Error('No prices in the latest row');
  return Response.json({date:String(row.date||'').slice(0,10),prices,source:'data.gov.my · Ministry of Finance weekly retail prices'},{headers:{'Cache-Control':'public, max-age=3600'}});
 }catch(error){return serviceFailure(error,'Official fuel prices are unavailable right now. You can enter a price yourself.')}
}
