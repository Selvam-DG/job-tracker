'use strict';
const JOB_PREFIX='job:';
let syncing=null;
const allJobs=async()=>Object.entries(await chrome.storage.local.get(null)).filter(([k,v])=>k.startsWith(JOB_PREFIX)&&v&&typeof v==='object').map(([,v])=>v);
const validEndpoint=s=>{try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='script.google.com'&&/^\/macros\/s\/[^/]+\/exec$/.test(u.pathname);}catch{return false;}};
async function syncJobs(){
  if(syncing)return syncing;
  syncing=(async()=>{
    const {sheetConfig={}}=await chrome.storage.local.get('sheetConfig');
    if(!validEndpoint(sheetConfig.webAppUrl)||!sheetConfig.secret)throw Error('Configure your Apps Script URL and secret in the dashboard first.');
    const jobs=(await allJobs()).filter(j=>j.updatedAt!==j.syncedAt).sort((a,b)=>(a.updatedAt||'').localeCompare(b.updatedAt||''));
    let succeeded=0;let failed=0;let lastError='';
    for(const job of jobs){
      try{
        const response=await fetch(sheetConfig.webAppUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({secret:sheetConfig.secret,record:job}),redirect:'follow'});
        if(!response.ok)throw Error('HTTP '+response.status);
        const data=await response.json();
        if(!data.ok||data.id!==job.id||data.updatedAt!==job.updatedAt)throw Error(data.error||'Unexpected server acknowledgement');
        const key=JOB_PREFIX+job.id;const fresh=(await chrome.storage.local.get(key))[key];
        if(fresh&&fresh.updatedAt===job.updatedAt)await chrome.storage.local.set({[key]:{...fresh,syncedAt:job.updatedAt}});
        succeeded++;
      }catch(err){failed++;lastError=String(err?.message||err);}
    }
    return {succeeded,failed,pending:(await allJobs()).filter(j=>j.updatedAt!==j.syncedAt).length,lastError};
  })();
  try{return await syncing;}finally{syncing=null;}
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type==='SYNC'){syncJobs().then(reply).catch(e=>reply({error:e.message}));return true;}
});
chrome.runtime.onInstalled.addListener(()=>chrome.alarms.create('sheetSync',{periodInMinutes:5}));
chrome.runtime.onStartup.addListener(()=>chrome.alarms.create('sheetSync',{periodInMinutes:5}));
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='sheetSync')syncJobs().catch(()=>{});});
