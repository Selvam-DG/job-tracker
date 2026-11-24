'use strict';
const STATUSES=['Bookmarked','Not Applied','Applied','Skipped','Interview','Offer','Rejected'];
const $=id=>document.getElementById(id);
const message=(s,error=false)=>{$('message').textContent=s;$('message').className=error?'error':'';};
const normalizeUrl=s=>{try{const u=new URL(s);u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(ref|trk|trackingId|originalSubdomain)$/i.test(k))u.searchParams.delete(k);return u.toString();}catch{return(s||'').trim();}};
const allJobs=async()=>Object.entries(await chrome.storage.local.get(null)).filter(([k,v])=>k.startsWith('job:')&&v&&typeof v==='object').map(([k,v])=>({...v,id:k.slice(4)}));
const iso=()=>new Date().toISOString();
const stamp=s=>s?new Date(s).toLocaleString():'';
const syncNow=()=>new Promise((resolve,reject)=>chrome.runtime.sendMessage({type:'SYNC'},r=>{if(chrome.runtime.lastError)return reject(Error(chrome.runtime.lastError.message));if(r?.error)return reject(Error(r.error));resolve(r);}));
async function saveJob(v,existingId){
  const jobs=await allJobs();const url=normalizeUrl(v.url);
  const match=(existingId&&jobs.find(j=>j.id===existingId))||(url&&jobs.find(j=>normalizeUrl(j.url)===url));
  const id=match?.id||crypto.randomUUID();const now=iso();const status=STATUSES.includes(v.status)?v.status:'Bookmarked';
  const changed=!match||match.status!==status;
  const history=[...(match?.history||[])];
  if(changed)history.push({eventId:crypto.randomUUID(),status,at:now,previousStatus:match?.status||'',source:'extension'});
  const record={...match,...v,url,id,status,history,createdAt:match?.createdAt||now,updatedAt:now,statusChangedAt:changed?now:(match?.statusChangedAt||now)};
  if(status==='Bookmarked'&&!record.bookmarkedAt)record.bookmarkedAt=now;
  if(status==='Applied'&&!record.appliedAt)record.appliedAt=now;
  await chrome.storage.local.set({['job:'+id]:record});
  syncNow().catch(()=>{});return{record,match:!!match};
}
async function changeStatus(job,status){if(job.status===status)return;await saveJob({company:job.company,position:job.position,location:job.location,url:job.url,source:job.source,notes:job.notes,status},job.id);}
