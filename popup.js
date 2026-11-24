'use strict';
const $ = id => document.getElementById(id);
const fields = ['company','position','location','url','source','status','date','notes'];
const message = (s, error=false) => { $('message').textContent=s; $('message').className=error?'error':''; };
const normalizeUrl = s => {try {const u=new URL(s); u.hash=''; for(const k of [...u.searchParams.keys()]) if(/^utm_|^(ref|trk|trackingId|originalSubdomain)$/i.test(k)) u.searchParams.delete(k); return u.toString();}catch{return (s||'').trim();}};
const validRecord = r => r && typeof r==='object' && (r.company||r.position||r.url);
const allJobs = async () => {const data=await chrome.storage.local.get(null);return Object.entries(data).filter(([k,v])=>k.startsWith('job:')&&validRecord(v)).map(([k,v])=>({...v,id:k.slice(4)}));};
function blank(){for(const f of fields) $(f).value='';$('status').value='Applied';$('date').value=new Date().toLocaleDateString('en-CA');}
function values(){const o={};for(const f of fields)o[f]=$(f).value.trim();o.url=normalizeUrl(o.url);return o;}
function fileDownload(name, contents, mime){const blob=new Blob([contents],{type:mime});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);}
const csvCell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
function parseCsv(text){let arr=[],row=[],cur='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cur);cur='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);if(row.some(x=>x!==''))arr.push(row);row=[];cur='';}else cur+=c;}row.push(cur);if(row.some(x=>x!==''))arr.push(row);const [header,...rows]=arr; if(!header)return[];return rows.map(r=>Object.fromEntries(header.map((k,i)=>[k.trim().replace(/^\uFEFF/,''),r[i]??''])));}
function extraction(){
  const take=(...vals)=>vals.find(x=>typeof x==='string'&&x.trim())?.trim()||'';
  const meta=(...names)=>{for(const n of names){const el=document.querySelector(`meta[property="${CSS.escape(n)}"],meta[name="${CSS.escape(n)}"]`);if(el?.content)return el.content;}return '';};
  const jsonld=[];
  for(const script of document.querySelectorAll('script[type="application/ld+json"]')){
    try{const x=JSON.parse(script.textContent);const walk=v=>{if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(walk);return;}const types=Array.isArray(v['@type'])?v['@type']:[v['@type']];if(types.includes('JobPosting'))jsonld.push(v);for(const [k,child]of Object.entries(v)){if(k==='@context')continue;if(child&&typeof child==='object')walk(child);}};walk(x);}catch{}
  }
  const job=jsonld[0]||{};
  const org=job.hiringOrganization;
  const location=job.jobLocation;
  const address=Array.isArray(location)?location[0]?.address:location?.address;
  const place=typeof address==='string'?address:[address?.addressLocality,address?.addressRegion,address?.addressCountry].filter(Boolean).join(', ');
  let title=take(job.title,meta('og:title'),document.querySelector('h1')?.textContent,document.title);
  let company=take(typeof org==='string'?org:org?.name,meta('og:site_name'));
  if(!company){const m=title.match(/\s(?:at|@|\|)\s(.+)$/i);if(m)company=m[1].trim();}
  const hostname=location?.hostname||window.location.hostname;
  let source=hostname.includes('linkedin.')?'LinkedIn':hostname.includes('indeed.')?'Indeed':hostname.includes('greenhouse.')?'Greenhouse':hostname.includes('lever.co')?'Lever':hostname.includes('myworkdayjobs.')?'Workday':hostname;
  return {company,position:title,location:take(place,job.jobLocationType==='TELECOMMUTE'?'Remote':'',meta('job:location')),url:window.location.href,source};
}
async function capture(){try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)throw Error('No active tab');const results=await chrome.scripting.executeScript({target:{tabId:tab.id},func:extraction});const data=results[0]?.result||{};for(const f of ['company','position','location','url','source']) $(f).value=data[f]||'';message('Captured available details. Check them before saving.');}catch(e){message('Cannot read this page (some Chrome pages are restricted). '+e.message,true);}}
async function save(){const v=values();if(!v.position&&!v.company){message('Enter a job position or company.',true);return;}const jobs=await allJobs();const match=v.url&&jobs.find(j=>normalizeUrl(j.url)===v.url);const id=match?.id||crypto.randomUUID();const record={...match,...v,id,createdAt:match?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};await chrome.storage.local.set({['job:'+id]:record});message(match?'Existing job updated.':'Application saved locally.');await render();}
async function render(){const q=$('search').value.toLowerCase();const jobs=(await allJobs()).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));$('count').textContent='('+jobs.length+')';$('records').replaceChildren();for(const j of jobs.filter(j=>[j.company,j.position,j.location,j.source].join(' ').toLowerCase().includes(q)).slice(0,100)){
  const d=document.createElement('div');d.className='record';const name=document.createElement('strong');name.textContent=[j.position,j.company].filter(Boolean).join(' — ')||'Job';d.append(name);const sm=document.createElement('small');sm.textContent=[j.location,j.date,j.source].filter(Boolean).join(' · ');d.append(sm);
  if(j.url&&/^https?:\/\//i.test(j.url)){const a=document.createElement('a');a.href=j.url;a.target='_blank';a.rel='noopener';a.textContent='Open job';d.append(a);}
  const actions=document.createElement('div');actions.className='record-actions';const status=document.createElement('select');for(const s of ['Saved','Applied','Interviewing','Offer','Rejected','Withdrawn']){const o=new Option(s,s);status.append(o);}status.value=j.status||'Saved';status.addEventListener('change',async()=>{await chrome.storage.local.set({['job:'+j.id]:{...j,status:status.value,updatedAt:new Date().toISOString()}});message('Status updated.');});
  const edit=document.createElement('button');edit.textContent='Edit';edit.addEventListener('click',()=>{for(const f of fields)$(f).value=j[f]||'';window.scrollTo(0,0);message('Edit fields and Save to update this job (same URL).');});
  const remove=document.createElement('button');remove.textContent='Delete';remove.addEventListener('click',async()=>{if(!confirm('Delete this job? Export a backup first.'))return;await chrome.storage.local.remove('job:'+j.id);await render();});actions.append(status,edit,remove);d.append(actions);$('records').append(d);
}}
async function exportData(format) {
  const jobs = await allJobs();
  const date = new Date().toISOString().slice(0,10);
  if (format === 'json') {
    const content = JSON.stringify({format:'local-job-tracker',version:1,exportedAt:new Date().toISOString(),jobs},null,2);
    fileDownload(`job-tracker-${date}.json`, content, 'application/json');
  } else {
    const keys = ['id', ...fields, 'createdAt', 'updatedAt'];
    const lines = [keys.join(',')];
    for (const job of jobs) lines.push(keys.map(key => csvCell(job[key])).join(','));
    fileDownload(`job-tracker-${date}.csv`, lines.join('\r\n'), 'text/csv;charset=utf-8');
  }
  message(`Exported ${jobs.length} records.`);
}

async function importData(file){try{const text=await file.text();const raw=file.name.toLowerCase().endsWith('.json')?JSON.parse(text):parseCsv(text);const imported=Array.isArray(raw)?raw:raw.jobs;if(!Array.isArray(imported))throw Error('Expected an array of jobs.');const existing=await allJobs();const byUrl=new Map(existing.filter(j=>j.url).map(j=>[normalizeUrl(j.url),j]));const byId=new Map(existing.map(j=>[j.id,j]));const updates={};let added=0,updated=0,skipped=0;
for(const r of imported){if(!validRecord(r)){skipped++;continue;}const orig=r.id&&byId.get(r.id);const match=orig||(r.url&&byUrl.get(normalizeUrl(r.url)));const id=match?.id||crypto.randomUUID();const clean={};for(const f of fields)clean[f]=typeof r[f]==='string'?r[f]:'';clean.url=normalizeUrl(clean.url);const merged={...match,...clean,id,createdAt:match?.createdAt||r.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};updates['job:'+id]=merged;byId.set(id,merged);if(merged.url)byUrl.set(merged.url,merged);match?updated++:added++;}
await chrome.storage.local.set(updates);message(`Imported: ${added} new, ${updated} updated, ${skipped} skipped.`);await render();}catch(e){message('Import failed: '+e.message,true);}finally{$('import').value='';}}
$('capture').addEventListener('click',capture);$('save').addEventListener('click',()=>save().catch(e=>message('Save failed: '+e.message,true)));$('search').addEventListener('input',render);$('csv').addEventListener('click',()=>exportData('csv'));$('json').addEventListener('click',()=>exportData('json'));$('import').addEventListener('change',e=>{if(e.target.files?.[0])importData(e.target.files[0]);});blank();render();
