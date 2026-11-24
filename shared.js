'use strict';
const STATUSES=['Bookmarked','Not Applied','Applied','Skipped','Interview','Offer','Rejected'];
const $=id=>document.getElementById(id);
const message=(s,error=false)=>{const node=$('message');node.textContent=s;node.className=error?'error':'';};
const validEndpoint=s=>{try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='script.google.com'&&/^\/macros\/s\/[^/]+\/exec$/.test(u.pathname)}catch{return false}};
const normalizeUrl=s=>{try{const u=new URL(s);u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(ref|trk|trackingId)$/i.test(k))u.searchParams.delete(k);return u.toString()}catch{return (s||'').trim()}};
const iso=()=>new Date().toISOString();
const getConfig=async()=>(await chrome.storage.local.get('sheetConfig')).sheetConfig||{};
async function request(action,fields={}){const config=await getConfig();if(!validEndpoint(config.webAppUrl)||!config.secret)throw Error('Connect Google Sheets in Dashboard / Settings first.');
 let response;try{response=await fetch(config.webAppUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,secret:config.secret,...fields}),redirect:'follow'});}catch(e){throw Error('Cannot connect to Apps Script: '+e.message)}
 if(!response.ok)throw Error('Apps Script returned HTTP '+response.status);let result;try{result=await response.json()}catch{throw Error('Could not read Apps Script response. Check web app deployment/permissions.')}if(!result.ok)throw Error(result.error||'Google Sheets request failed');return result;}
async function listJobs(){return(await request('list')).jobs||[]}
async function saveJob(data,existingId){const records=await listJobs(),url=normalizeUrl(data.url);const prior=(existingId&&records.find(j=>j.id===existingId))||(url&&records.find(j=>normalizeUrl(j.url)===url));const record={...prior,...data,id:prior?.id||crypto.randomUUID(),url};const result=await request('save',{record});return {record,result,matched:!!prior};}
async function setStatus(job,status){return request('status',{id:job.id,status})}
const descriptionPreview=s=>(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,8000);
