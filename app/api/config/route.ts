import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';

/** Public, non-secret settings the browser needs: map tiles and whether accounts are available on this host. */
export async function GET(){
 const e=env as unknown as Record<string,string|undefined>;
 const url=e.NAVIYA_TILE_URL&&/^https:\/\/[^\s]+\{z\}[^\s]*\{x\}[^\s]*\{y\}/.test(e.NAVIYA_TILE_URL)?e.NAVIYA_TILE_URL:null;
 return Response.json({
  accounts:e.NAVIYA_PUBLIC_HOSTING!=='true',
  tiles:url?{url,attribution:(e.NAVIYA_TILE_ATTRIBUTION||'').slice(0,300),maxZoom:Math.min(22,Math.max(10,Number(e.NAVIYA_TILE_MAX_ZOOM)||19))}:null,
 },{headers:{'Cache-Control':'public, max-age=300'}});
}
