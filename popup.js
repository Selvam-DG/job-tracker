'use strict';
let editingId=null;
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

const fields=['company','position','location','url','source','status','notes'];
function clearForm(){editingId=null;for(const f of fields)$(f).value='';$('status').value='Bookmarked';$('source').value='Other portal';}
async function capture(){try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)throw Error('No active tab');const results=await chrome.scripting.executeScript({target:{tabId:tab.id},func:extraction});const data=results[0]?.result||{};for(const f of ['company','position','location','url'])$(f).value=data[f]||'';const src=data.source||'';$('source').value=src==='LinkedIn'?'LinkedIn':src==='Indeed'?'Indeed':(/greenhouse|lever|workday|job|indeed/i.test(src)?'Job portal':'Company career site');message('Captured available details. Verify before saving.');}catch(e){message('Could not capture page: '+e.message,true);}}
async function save(){const v=Object.fromEntries(fields.map(f=>[f,$(f).value.trim()]));if(!v.position&&!v.company)throw Error('Enter a company or position');const {match}=await saveJob(v,editingId);message((match?'Updated':'Saved')+' locally; Sheets sync queued.');clearForm();await render();}
async function render(){const jobs=(await allJobs()).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));const q=$('search').value.toLowerCase();$('count').textContent=`(${jobs.length})`;$('records').replaceChildren();const pending=jobs.filter(j=>j.updatedAt!==j.syncedAt).length;$('syncInfo').textContent=`${pending} waiting to sync · ${jobs.length} saved locally`;
for(const j of jobs.filter(j=>[j.company,j.position,j.location,j.source].join(' ').toLowerCase().includes(q)).slice(0,100)){
 const d=document.createElement('div');d.className='record';const name=document.createElement('strong');name.textContent=[j.position,j.company].filter(Boolean).join(' — ')||'Job';d.append(name);const sm=document.createElement('small');sm.textContent=[j.source,j.location,stamp(j.statusChangedAt),j.updatedAt===j.syncedAt?'Synced':'Pending'].filter(Boolean).join(' · ');d.append(sm);
 if(j.url&&/^https?:\/\//i.test(j.url)){const a=document.createElement('a');a.href=j.url;a.target='_blank';a.rel='noopener';a.textContent='Open job';d.append(a);}
 const actions=document.createElement('div');actions.className='record-actions';const status=document.createElement('select');for(const s of STATUSES)status.add(new Option(s,s));status.value=j.status||'Bookmarked';status.addEventListener('change',async()=>{await changeStatus(j,status.value);message('Status saved. Sheets sync queued.');await render();});
 const edit=document.createElement('button');edit.textContent='Edit';edit.addEventListener('click',()=>{editingId=j.id;for(const f of fields)$(f).value=j[f]||'';window.scrollTo(0,0);message('Editing job. Save to update the SAME record.');});actions.append(status,edit);d.append(actions);$('records').append(d);
}}
$('capture').addEventListener('click',capture);$('save').addEventListener('click',()=>save().catch(e=>message(e.message,true)));$('search').addEventListener('input',render);$('dashboard').addEventListener('click',()=>chrome.runtime.openOptionsPage());$('sync').addEventListener('click',()=>syncNow().then(r=>{message(`Synced ${r.succeeded}; pending ${r.pending}. ${r.lastError||''}`,!!r.failed);render();}).catch(e=>message(e.message,true)));clearForm();render();
