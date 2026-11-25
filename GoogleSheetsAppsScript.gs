/** Sheet-backed job tracker v3. Bound to the target spreadsheet.
 * Project Settings > Script Properties: TRACKER_SECRET (24+ chars).
 * Deploy as Web app / execute as Me / access Anyone. Keep secret private.
 */
const JOBS_TAB='Applications', EVENTS_TAB='Status History', CONTACTS_TAB='Contacts';
const STATUSES=['Bookmarked','Not Applied','Applied','Skipped','Interview','Offer','Rejected'];
const JOB_HEADERS=['Job ID','Company','Position','Location','Job URL','Source','Status','Created Date','Created Time','Last Changed Date','Last Changed Time','Language','Salary From','Salary To','Salary Currency','Job Description','Notes','Created At ISO','Updated At ISO'];
const EVENT_HEADERS=['Event ID','Job ID','Company','Position','Previous Status','New Status','Changed Date','Changed Time','Changed At ISO','Source','Job URL'];
function doPost(e){try{
 const body=JSON.parse(e.postData.contents||'{}');const key=PropertiesService.getScriptProperties().getProperty('TRACKER_SECRET');
 if(!key||key.length<24||body.secret!==key)throw Error('Unauthorized or server secret not configured');
 if(body.action==='list')return reply_({ok:true,jobs:listJobs_()});
 if(body.action==='save')return reply_(saveJob_(body.record||{}));
 if(body.action==='status')return reply_(changeStatus_(body.id,body.status));
 if(body.action==='listContacts')return reply_({ok:true,contacts:listContacts_(body.jobId)});
 if(body.action==='saveContact')return reply_(saveContact_(body.contact||{}));
 if(body.action==='deleteContact')return reply_(deleteContact_(body.id,body.jobId));
 throw Error('Unknown action');
 }catch(err){return reply_({ok:false,error:String(err.message||err)})}}
function doGet(){return reply_({ok:true,service:'Job Tracker v3',note:'Use authenticated POST requests'});}
function reply_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function book_(){const s=SpreadsheetApp.getActiveSpreadsheet();if(!s)throw Error('Open Apps Script from the target spreadsheet');return s}
function tab_(name,headers){const book=book_();let sh=book.getSheetByName(name);if(!sh)sh=book.insertSheet(name);
 const existing=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0]:[];
 if(!existing.some(x=>x)){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1)}
 else{const missing=headers.filter(x=>!existing.includes(x));if(missing.length)sh.getRange(1,existing.length+1,1,missing.length).setValues([missing]);}
 const finalHeaders=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];sh.getRange(1,1,1,finalHeaders.length).setFontWeight('bold').setBackground('#e8eefc');return {sh,headers:finalHeaders};}
function rowObj_(headers,row){const obj={};headers.forEach((h,i)=>obj[h]=row[i]===undefined?'':row[i]);return obj}
function rows_(t){const n=t.sh.getLastRow();return n<2?[]:t.sh.getRange(2,1,n-1,t.headers.length).getDisplayValues().map((v,i)=>({...rowObj_(t.headers,v),_row:i+2}));}
function find_(t,id){return rows_(t).find(x=>x['Job ID']===id)}
function safe_(v,max=30000){let s=String(v==null?'':v).slice(0,max);if(/^\s*[=+@\-]/.test(s))s="'"+s;return s}
function validId_(id){return typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id)}
function localParts_(date){const tz=book_().getSpreadsheetTimeZone()||'Europe/Berlin';return [Utilities.formatDate(date,tz,'yyyy-MM-dd'),Utilities.formatDate(date,tz,'HH:mm')];}
function addEvent_(id,r,from,to,at,source){const t=tab_(EVENTS_TAB,EVENT_HEADERS);const eventId=Utilities.getUuid();const [d,time]=localParts_(at);const event={'Event ID':eventId,'Job ID':id,'Company':r.company,'Position':r.position,'Previous Status':from,'New Status':to,'Changed Date':d,'Changed Time':time,'Changed At ISO':at.toISOString(),'Source':source||r.source,'Job URL':r.url};t.sh.appendRow(t.headers.map(h=>safe_(event[h],10000)));}
function listJobs_(){const t=tab_(JOBS_TAB,JOB_HEADERS);return rows_(t).filter(r=>validId_(r['Job ID'])).map(r=>({id:r['Job ID'],company:r.Company||'',position:r.Position||'',location:r.Location||'',url:r['Job URL']||'',source:r.Source||'',status:STATUSES.includes(r.Status)?r.Status:'Bookmarked',language:r.Language||'',salaryFrom:r['Salary From']||'',salaryTo:r['Salary To']||'',currency:r['Salary Currency']||'',description:r['Job Description']||'',notes:r.Notes||'',createdDate:r['Created Date']||'',createdTime:r['Created Time']||'',changedDate:r['Last Changed Date']||'',changedTime:r['Last Changed Time']||'',createdAt:r['Created At ISO']||r['Created At']||'',updatedAt:r['Updated At ISO']||r['Updated At']||''}));}
function saveJob_(r){if(!validId_(r.id))throw Error('Invalid job id');if(!r.company&&!r.position)throw Error('Enter company or position');if(!STATUSES.includes(r.status))throw Error('Invalid status');const lock=LockService.getScriptLock();lock.waitLock(25000);
 try{const t=tab_(JOBS_TAB,JOB_HEADERS),old=find_(t,r.id),now=new Date(),oldStatus=old?.Status||'',changed=!old||oldStatus!==r.status;
 const [newDate,newTime]=localParts_(now);const createdDate=old?.['Created Date']||newDate,createdTime=old?.['Created Time']||newTime;
 const changedDate=changed?newDate:(old?.['Last Changed Date']||createdDate),changedTime=changed?newTime:(old?.['Last Changed Time']||createdTime);
 const oldCreated=old?.['Created At ISO']||old?.['Created At']||now.toISOString();
 const fields={'Job ID':r.id,'Company':r.company,'Position':r.position,'Location':r.location,'Job URL':r.url,'Source':r.source,'Status':r.status,'Created Date':createdDate,'Created Time':createdTime,'Last Changed Date':changedDate,'Last Changed Time':changedTime,'Language':r.language,'Salary From':r.salaryFrom,'Salary To':r.salaryTo,'Salary Currency':r.currency||'EUR','Job Description':r.description,'Notes':r.notes,'Created At ISO':oldCreated,'Updated At ISO':now.toISOString()};
 // Keep legacy columns intact rather than deleting them or replacing entire sheets.
 const existing=old?t.sh.getRange(old._row,1,1,t.headers.length).getValues()[0]:t.headers.map(()=>'');
 const row=t.headers.map((h,i)=>Object.prototype.hasOwnProperty.call(fields,h)?safe_(fields[h],h==='Job Description'?30000:10000):existing[i]);
 if(old)t.sh.getRange(old._row,1,1,row.length).setValues([row]);else t.sh.appendRow(row);
 const index=t.headers.indexOf('Status')+1,number=old?old._row:t.sh.getLastRow();const rule=SpreadsheetApp.newDataValidation().requireValueInList(STATUSES,true).setAllowInvalid(false).build();t.sh.getRange(number,index).setDataValidation(rule);
 if(changed)addEvent_(r.id,r,oldStatus,r.status,now,r.source);
 SpreadsheetApp.flush();return {ok:true,id:r.id,action:old?'updated':'created',createdDate,createdTime,changedDate,changedTime};
 }finally{lock.releaseLock()}}
function changeStatus_(id,status){if(!validId_(id)||!STATUSES.includes(status))throw Error('Invalid job or status');const jobs=listJobs_(),record=jobs.find(x=>x.id===id);if(!record)throw Error('Job not found');if(record.status===status)return {ok:true,id,action:'unchanged'};return saveJob_({...record,status});}
/** Optional: view configuration health without printing the secret. */
function testConfiguration(){const s=PropertiesService.getScriptProperties().getProperty('TRACKER_SECRET');console.log(JSON.stringify({secretConfigured:!!s,secretLengthValid:!!s&&s.length>=24,spreadsheetAccessible:!!SpreadsheetApp.getActiveSpreadsheet()}));}


/** Contacts: one or more professional contacts per existing job. No scraping on the server. */
const CONTACT_HEADERS=['Contact ID','Job ID','Name','Contact Type','Role','Department','Email','Phone','LinkedIn URL','Source','Language','Notes','Created Date','Created Time','Updated Date','Updated Time','Created At ISO','Updated At ISO'];
function contactRow_(r){return {id:r['Contact ID'],jobId:r['Job ID'],name:r.Name||'',type:r['Contact Type']||'',role:r.Role||'',department:r.Department||'',email:r.Email||'',phone:r.Phone||'',linkedin:r['LinkedIn URL']||'',source:r.Source||'',language:r.Language||'',notes:r.Notes||'',createdDate:r['Created Date']||'',createdTime:r['Created Time']||'',updatedDate:r['Updated Date']||'',updatedTime:r['Updated Time']||'',createdAt:r['Created At ISO']||'',updatedAt:r['Updated At ISO']||''};}
function listContacts_(jobId){if(jobId&& !validId_(jobId))throw Error('Invalid job ID');const t=tab_(CONTACTS_TAB,CONTACT_HEADERS);return rows_(t).filter(r=>validId_(r['Contact ID'])&&validId_(r['Job ID'])&&(!jobId||r['Job ID']===jobId)).map(contactRow_);}
function saveContact_(c){if(!validId_(c.jobId))throw Error('Invalid parent Job ID');if(!c.name&&!c.email)throw Error('Contact needs a name or email');if(c.email&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email)))throw Error('Invalid email');for(const key of ['linkedin'])if(c[key]&&!/^https:\/\//i.test(String(c[key])))throw Error('LinkedIn URL must be HTTPS');
 const lock=LockService.getScriptLock();lock.waitLock(25000);try{if(!find_(tab_(JOBS_TAB,JOB_HEADERS),c.jobId))throw Error('Parent job not found in Applications');
 const t=tab_(CONTACTS_TAB,CONTACT_HEADERS),old=c.id?rows_(t).find(x=>x['Contact ID']===c.id):null;if(c.id&&!validId_(c.id))throw Error('Invalid contact ID');if(old&&old['Job ID']!==c.jobId)throw Error('Contact belongs to a different job');const id=old?old['Contact ID']:(c.id||Utilities.getUuid()),now=new Date(),parts=localParts_(now);
 const record={'Contact ID':id,'Job ID':c.jobId,'Name':c.name,'Contact Type':c.type,'Role':c.role,'Department':c.department,'Email':c.email,'Phone':c.phone,'LinkedIn URL':c.linkedin,'Source':c.source,'Language':c.language,'Notes':c.notes,'Created Date':old?old['Created Date']:parts[0],'Created Time':old?old['Created Time']:parts[1],'Updated Date':parts[0],'Updated Time':parts[1],'Created At ISO':old?old['Created At ISO']:now.toISOString(),'Updated At ISO':now.toISOString()};
 const prior=old?t.sh.getRange(old._row,1,1,t.headers.length).getValues()[0]:t.headers.map(()=>'');const row=t.headers.map((h,i)=>Object.prototype.hasOwnProperty.call(record,h)?safe_(record[h],h==='Notes'?20000:5000):prior[i]);if(old)t.sh.getRange(old._row,1,1,row.length).setValues([row]);else t.sh.appendRow(row);SpreadsheetApp.flush();return {ok:true,id,action:old?'updated':'created'};
 }finally{lock.releaseLock();}}
function deleteContact_(id,jobId){if(!validId_(id)||!validId_(jobId))throw Error('Invalid contact or job ID');const lock=LockService.getScriptLock();lock.waitLock(25000);try{const t=tab_(CONTACTS_TAB,CONTACT_HEADERS),r=rows_(t).find(x=>x['Contact ID']===id&&x['Job ID']===jobId);if(!r)throw Error('Contact not found for this job');t.sh.deleteRow(r._row);return {ok:true,id,deleted:true};}finally{lock.releaseLock();}}
