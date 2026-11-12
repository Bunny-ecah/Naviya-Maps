/**
 * On a self-hosted public site there is no ChatGPT Sites platform in front of Naviya, so any
 * "oai-authenticated-*" header came from the visitor and must not be trusted as an identity.
 */
export function stripIdentityHeaders(request:Request,publicHosting:boolean){
 if(!publicHosting)return request;
 const headers=new Headers(request.headers);
 let changed=false;
 for(const name of [...headers.keys()])if(name.toLowerCase().startsWith('oai-authenticated-')){headers.delete(name);changed=true}
 return changed?new Request(request,{headers}):request;
}
