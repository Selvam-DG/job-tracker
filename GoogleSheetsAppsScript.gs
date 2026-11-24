/** Paste this entire file into Extensions > Apps Script in the TARGET Google Sheet.
 * Project Settings > Script properties: TRACKER_SECRET = a long random secret.
 * Deploy > New deployment > Web app > Execute as Me > Who has access: Anyone.
 * Treat the web app URL and secret as private; possession grants write access to these tabs.
 */
const JOBS_TAB = 'Applications';
const EVENTS_TAB = 'Status History';
const STATUSES = ['Bookmarked','Not Applied','Applied','Skipped','Interview','Offer','Rejected'];
const JOB_COLUMNS = ['Job ID','Company','Position','Location','Job URL','Source','Status','Bookmarked At','Applied At','Created At','Status Changed At','Updated At','Synced At','Notes'];
const EVENT_COLUMNS = ['Event ID','Job ID','Company','Position','Previous Status','New Status','Changed At','Received At'];

function doPost(e){
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const secret=PropertiesService.getScriptProperties().getProperty('TRACKER_SECRET');
    if(!secret || secret.length < 24 || body.secret !== secret)throw Error('Unauthorized or server secret not configured');
    const r=body.record;
    if(!r || typeof r!=='object' || typeof r.id!=='string'|| !/^[0-9a-f-]{36}$/i.test(r.id))throw Error('Invalid job ID');
    if(!STATUSES.includes(r.status))throw Error('Invalid status');
    if(!r.updatedAt || !/^\d{4}-\d\d-\d\dT/.test(r.updatedAt))throw Error('Missing update timestamp');
    if(!r.company && !r.position)throw Error('Company or position required');
    const result=writeRecord_(r);
    return respond_({ok:true,id:r.id,updatedAt:r.updatedAt,action:result});
  }catch(err){return respond_({ok:false,error:String(err.message||err)});}
}
function doGet(){return respond_({ok:true,service:'Job tracker sheet writer (POST required)'});}
function respond_(object){return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);}
function safe_(v){const s=String(v==null?'':v).slice(0,12000);return /^[\s]*[=+\-@]/.test(s)?"'"+s:s;}
function ensureTab_(book,name,headers){
  let sh=book.getSheetByName(name);
  if(!sh)sh=book.insertSheet(name);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#dbeafe');}
  else if(sh.getRange(1,1,1,headers.length).getValues()[0].join('|')!==headers.join('|'))throw Error('Tab "'+name+'" has different headers. Rename that existing tab to preserve it and retry.');
  return sh;
}
function findRow_(sh,id){const last=sh.getLastRow();if(last<2)return 0;const hits=sh.getRange(2,1,last-1,1).createTextFinder(id).matchEntireCell(true).findNext();return hits?hits.getRow():0;}
function writeRecord_(r){
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const book=SpreadsheetApp.getActiveSpreadsheet();if(!book)throw Error('Apps Script must be attached to your target Sheet');
    const sh=ensureTab_(book,JOBS_TAB,JOB_COLUMNS);
    const events=ensureTab_(book,EVENTS_TAB,EVENT_COLUMNS);
    const existingRow=findRow_(sh,r.id);
    const received=new Date().toISOString();
    const values=[r.id,r.company,r.position,r.location,r.url,r.source,r.status,r.bookmarkedAt,r.appliedAt,r.createdAt,r.statusChangedAt,r.updatedAt,received,r.notes].map(safe_);
    if(existingRow)sh.getRange(existingRow,1,1,values.length).setValues([values]);
    else sh.appendRow(values);
    const row=existingRow||sh.getLastRow();
    const validation=SpreadsheetApp.newDataValidation().requireValueInList(STATUSES,true).setAllowInvalid(false).build();
    sh.getRange(row,7).setDataValidation(validation);
    const history=Array.isArray(r.history)?r.history:[];
    for(const evt of history){
      if(!evt || !evt.eventId || !/^[0-9a-f-]{36}$/i.test(String(evt.eventId)) || !STATUSES.includes(evt.status))continue;
      if(findRow_(events,String(evt.eventId)))continue;
      events.appendRow([evt.eventId,r.id,r.company,r.position,evt.previousStatus||'',evt.status,evt.at||'',received].map(safe_));
    }
    SpreadsheetApp.flush();
    return existingRow?'updated':'inserted';
  }finally{lock.releaseLock();}
}
