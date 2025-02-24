// getcalendar (projectid)


import { REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ROLES_ORDER, ADMIN_METHODS, BUCKET_NAME, s3Client, GetObjectCommand, PutObjectCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { processUpdateUserMap } from './updateusermap.mjs'
import { processNotifyChange } from './notifychange.mjs'
const pushUser = (usermap, userid, role, countryid, countryname, entityid, entityname, locationid, locationname, tags) => {
    
    if(usermap[userid] == null) usermap[userid] = {};
    if(usermap[userid]['roles'] == null) usermap[userid]['roles'] = {};
    if(usermap[userid]['roles'][role] == null) usermap[userid]['roles'][role] = {};
    if(usermap[userid][countryname+';'+countryid] == null) usermap[userid][countryname+';'+countryid] = {};
    if(usermap[userid][countryname+';'+countryid] == null) usermap[userid][countryname+';'+countryid] = {};
    if(usermap[userid][countryname+';'+countryid][entityname+';'+entityid] == null) usermap[userid][countryname+';'+countryid][entityname+';'+entityid] = {};
    if(usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid] == null) usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid] = {};
    if(usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid]['tags'] == null) usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid]['tags'] = [];
    
    for(var i = 0; i < tags.length; i++) {
        
        if(!usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid]['tags'].includes(tags[i])) {
            usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid]['tags'].push(tags[i]);
        }
        
    }
    // console.log('pushing', userid, countryname+';'+countryid, entityname+';'+entityid, locationname+';'+locationid, tags )
    return usermap; 
    
}


export const processGenerateUserMap = async (event) => {
    
    if((event["headers"]["Authorization"]) == null) {
        return {statusCode: 400, body: { result: false, error: "Malformed headers!"}};
    }
    
    if((event["headers"]["Authorization"].split(" ")[1]) == null) {
        return {statusCode: 400, body: { result: false, error: "Malformed headers!"}};
    }
    
    var hAscii = Buffer.from((event["headers"]["Authorization"].split(" ")[1] + ""), 'base64').toString('ascii');
    
    if(hAscii.split(":")[1] == null) {
        return {statusCode: 400, body: { result: false, error: "Malformed headers!"}};
    }
    
    const email = hAscii.split(":")[0];
    const accessToken = hAscii.split(":")[1];
    
    if(email == "" || !email.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)) {
        return {statusCode: 400, body: {result: false, error: "Malformed headers!"}}
    }
    
    if(accessToken.length < 5) {
        return {statusCode: 400, body: {result: false, error: "Malformed headers!"}}
    }
    
    const authResult = await processAuthenticate(event["headers"]["Authorization"]);
    
    if(!authResult.result) {
        return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    }
    
    var projectid = null;
    var year = null;
    var userid = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        year = JSON.parse(event.body).year;
        userid = JSON.parse(event.body).userid;
    } catch (e) {
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    if(userid == null || userid == "" || userid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "User Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(year == null) {
        
        year = new Date().getFullYear() + "";
        
    }
    
    var arrReportersEvents = {};
    var arrApproversEvents = {};
    var arrFunctionHeadsEvents = {};
    var arrAuditorsEvents = {};
    var arrViewersEvents = {};
    
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + userid + '_' + year + '_reporter_calendar_job_enc.json',
    });
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body; 
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        const jsonContent = JSON.parse(decryptedData);
        arrReportersEvents = jsonContent;
        
    } catch (err) {
        console.log('read error', command.Key, err)
    }
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + userid + '_' + year + '_approver_calendar_job_enc.json',
    });
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body; 
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        const jsonContent = JSON.parse(decryptedData);
        arrApproversEvents = jsonContent;
        
    } catch (err) {
        console.log('read error', command.Key, err)
    }
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + userid + '_' + year + '_functionhead_calendar_job_enc.json',
    });
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body; 
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        const jsonContent = JSON.parse(decryptedData);
        arrFunctionHeadsEvents = jsonContent;
        
    } catch (err) {
        console.log('read error', command.Key, err)
    }
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + userid + '_' + year + '_auditor_calendar_job_enc.json',
    });
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body; 
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        const jsonContent = JSON.parse(decryptedData);
        arrAuditorsEvents = jsonContent;
        
    } catch (err) {
        console.log('read error',  err)
    }
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + userid + '_' + year + '_viewer_calendar_job_enc.json',
    });
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body; 
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        const jsonContent = JSON.parse(decryptedData);
        arrViewersEvents = jsonContent;
        
    } catch (err) {
        console.log('read error', command.Key, err)
    }
        
        
    
    
    var usermap = {};
    //[userId][mmddyyyy][item.entityid][item.locationid]
    
    for(var n = 0; n < Object.keys(arrViewersEvents).length; n++) {
        console.log('mmddyyyy found', Object.keys(arrViewersEvents).length)
        const mmddyyyy = Object.keys(arrViewersEvents)[n];
    
        for(var j = 0; j < Object.keys(arrViewersEvents[mmddyyyy]).length; j++) {
            console.log('entity found', Object.keys(arrViewersEvents[mmddyyyy]).length)
            const entityid = Object.keys(arrViewersEvents[mmddyyyy])[j];
            
            if(entityid.length != 36) {
                console.log('continueing', entityid)
                continue;
            }
            
            for(var k = 0; k < Object.keys(arrViewersEvents[mmddyyyy][entityid]).length; k++) {
                
                const locationid = Object.keys(arrViewersEvents[mmddyyyy][entityid])[k];
                
                if(locationid.length != 36){ 
                    console.log('continuing locationid', locationid)
                    continue;
                } 
                console.log('events found', arrViewersEvents[mmddyyyy][entityid][locationid].length)
                for(var l = 0; l < arrViewersEvents[mmddyyyy][entityid][locationid].length; l++) {
                    
                    const ev = arrViewersEvents[mmddyyyy][entityid][locationid][l];
                    const countryid = ev.countryid;
                    const countryname = ev.countryname;
                    const entityname = ev.entityname;
                    const locationname = ev.locationname;
                    const tags = ev.tags;
                    console.log('viewers found', ev.viewers.length);
                    for(var m = 0; m < ev.viewers.length; m++) {
                        
                        const viewersid = ev.viewers[m].split(';')[1];
                        if(viewersid == userid){
                            usermap = pushUser(usermap, viewersid, 'viewer', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.approvers.length; m++) {
                        
                        const approverid = ev.approvers[m].split(';')[1];
                        if(approverid == userid && ev.makercheckers.length == 0){
                            usermap = pushUser(usermap, approverid, 'approver', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.reporters.length; m++) {
                        
                        const reporterid = ev.reporters[m].split(';')[1];
                        if(reporterid == userid){
                            usermap = pushUser(usermap, reporterid, 'reporter', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.functionheads.length; m++) {
                        
                        const functionheadid = ev.functionheads[m].split(';')[1];
                        if(functionheadid == userid){
                            usermap = pushUser(usermap, functionheadid, 'functionhead', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.auditors.length; m++) {
                        
                        // console.log('auditors', ev.auditors, projectid);
                        const auditorid = ev.auditors[m].split(';')[1];
                        if(auditorid == userid){
                            usermap = pushUser(usermap, auditorid, 'auditor', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                }
            }
        }
    }
    
    
    for(var n = 0; n < Object.keys(arrApproversEvents).length; n++) {
        
        const mmddyyyy = Object.keys(arrApproversEvents)[n];
    
        for(var j = 0; j < Object.keys(arrApproversEvents[mmddyyyy]).length; j++) {
            
            const entityid = Object.keys(arrApproversEvents[mmddyyyy])[j];
            
            if(entityid.length != 36) continue;
            
            for(var k = 0; k < Object.keys(arrApproversEvents[mmddyyyy][entityid]).length; k++) {
                
                const locationid = Object.keys(arrApproversEvents[mmddyyyy][entityid])[k];
                
                if(locationid.length != 36) continue; 
                
                for(var l = 0; l < arrApproversEvents[mmddyyyy][entityid][locationid].length; l++) {
                    
                    const ev = arrApproversEvents[mmddyyyy][entityid][locationid][l];
                    const countryid = ev.countryid;
                    const countryname = ev.countryname;
                    const entityname = ev.entityname;
                    const locationname = ev.locationname;
                    const tags = ev.tags;
                    
                    for(var m = 0; m < ev.viewers.length; m++) {
                        
                        const viewersid = ev.viewers[m].split(';')[1];
                        if(viewersid == userid){
                            usermap = pushUser(usermap, viewersid, 'viewer', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.approvers.length; m++) {
                        
                        const approverid = ev.approvers[m].split(';')[1];
                        if(approverid == userid && ev.makercheckers.length == 0){
                            usermap = pushUser(usermap, approverid, 'approver', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.reporters.length; m++) {
                        
                        const reporterid = ev.reporters[m].split(';')[1];
                        if(reporterid == userid){
                            usermap = pushUser(usermap, reporterid, 'reporter', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.functionheads.length; m++) {
                        
                        const functionheadid = ev.functionheads[m].split(';')[1];
                        if(functionheadid == userid){
                            usermap = pushUser(usermap, functionheadid, 'functionhead', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.auditors.length; m++) {
                        
                        // console.log('auditors', ev.auditors, projectid);
                        const auditorid = ev.auditors[m].split(';')[1];
                        if(auditorid == userid){
                            usermap = pushUser(usermap, auditorid, 'auditor', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                }
            }
        }
    }
    
    
    for(var n = 0; n < Object.keys(arrReportersEvents).length; n++) {
        
        const mmddyyyy = Object.keys(arrReportersEvents)[n];
    
        for(var j = 0; j < Object.keys(arrReportersEvents[mmddyyyy]).length; j++) {
            
            const entityid = Object.keys(arrReportersEvents[mmddyyyy])[j];
            
            if(entityid.length != 36) continue;
            
            for(var k = 0; k < Object.keys(arrReportersEvents[mmddyyyy][entityid]).length; k++) {
                
                const locationid = Object.keys(arrReportersEvents[mmddyyyy][entityid])[k];
                
                if(locationid.length != 36) continue; 
                
                for(var l = 0; l < arrReportersEvents[mmddyyyy][entityid][locationid].length; l++) {
                    
                    const ev = arrReportersEvents[mmddyyyy][entityid][locationid][l];
                    const countryid = ev.countryid;
                    const countryname = ev.countryname;
                    const entityname = ev.entityname;
                    const locationname = ev.locationname;
                    const tags = ev.tags;
                    
                    for(var m = 0; m < ev.viewers.length; m++) {
                        
                        const viewersid = ev.viewers[m].split(';')[1];
                        if(viewersid == userid){
                            usermap = pushUser(usermap, viewersid, 'viewer', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.approvers.length; m++) {
                        
                        const approverid = ev.approvers[m].split(';')[1];
                        if(approverid == userid && ev.makercheckers.length == 0){
                            usermap = pushUser(usermap, approverid, 'approver', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.reporters.length; m++) {
                        
                        const reporterid = ev.reporters[m].split(';')[1];
                        if(reporterid == userid){
                            usermap = pushUser(usermap, reporterid, 'reporter', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.functionheads.length; m++) {
                        
                        const functionheadid = ev.functionheads[m].split(';')[1];
                        if(functionheadid == userid){
                            usermap = pushUser(usermap, functionheadid, 'functionhead', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.auditors.length; m++) {
                        
                        // console.log('auditors', ev.auditors, projectid);
                        const auditorid = ev.auditors[m].split(';')[1];
                        if(auditorid == userid){
                            usermap = pushUser(usermap, auditorid, 'auditor', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                }
            }
        }
    }
    
    
    for(var n = 0; n < Object.keys(arrFunctionHeadsEvents).length; n++) {
        
        const mmddyyyy = Object.keys(arrFunctionHeadsEvents)[n];
    
        for(var j = 0; j < Object.keys(arrFunctionHeadsEvents[mmddyyyy]).length; j++) {
            
            const entityid = Object.keys(arrFunctionHeadsEvents[mmddyyyy])[j];
            
            if(entityid.length != 36) continue;
            
            for(var k = 0; k < Object.keys(arrFunctionHeadsEvents[mmddyyyy][entityid]).length; k++) {
                
                const locationid = Object.keys(arrFunctionHeadsEvents[mmddyyyy][entityid])[k];
                
                if(locationid.length != 36) continue; 
                
                for(var l = 0; l < arrFunctionHeadsEvents[mmddyyyy][entityid][locationid].length; l++) {
                    
                    const ev = arrFunctionHeadsEvents[mmddyyyy][entityid][locationid][l];
                    const countryid = ev.countryid;
                    const countryname = ev.countryname;
                    const entityname = ev.entityname;
                    const locationname = ev.locationname;
                    const tags = ev.tags;
                    
                    for(var m = 0; m < ev.viewers.length; m++) {
                        
                        const viewersid = ev.viewers[m].split(';')[1];
                        if(viewersid == userid){
                            usermap = pushUser(usermap, viewersid, 'viewer', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.approvers.length; m++) {
                        
                        const approverid = ev.approvers[m].split(';')[1];
                        if(approverid == userid && ev.makercheckers.length == 0){
                            usermap = pushUser(usermap, approverid, 'approver', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.reporters.length; m++) {
                        
                        const reporterid = ev.reporters[m].split(';')[1];
                        if(reporterid == userid){
                            usermap = pushUser(usermap, reporterid, 'reporter', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.functionheads.length; m++) {
                        
                        const functionheadid = ev.functionheads[m].split(';')[1];
                        if(functionheadid == userid){
                            usermap = pushUser(usermap, functionheadid, 'functionhead', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.auditors.length; m++) {
                        
                        // console.log('auditors', ev.auditors, projectid);
                        const auditorid = ev.auditors[m].split(';')[1];
                        if(auditorid == userid){
                            usermap = pushUser(usermap, auditorid, 'auditor', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                }
            }
        }
    }
    
    for(var n = 0; n < Object.keys(arrAuditorsEvents).length; n++) {
        
        const mmddyyyy = Object.keys(arrAuditorsEvents)[n];
    
        for(var j = 0; j < Object.keys(arrAuditorsEvents[mmddyyyy]).length; j++) {
            
            const entityid = Object.keys(arrAuditorsEvents[mmddyyyy])[j];
            
            if(entityid.length != 36) continue;
            
            for(var k = 0; k < Object.keys(arrAuditorsEvents[mmddyyyy][entityid]).length; k++) {
                
                const locationid = Object.keys(arrAuditorsEvents[mmddyyyy][entityid])[k];
                
                if(locationid.length != 36) continue; 
                
                for(var l = 0; l < arrAuditorsEvents[mmddyyyy][entityid][locationid].length; l++) {
                    
                    const ev = arrAuditorsEvents[mmddyyyy][entityid][locationid][l];
                    const countryid = ev.countryid;
                    const countryname = ev.countryname;
                    const entityname = ev.entityname;
                    const locationname = ev.locationname;
                    const tags = ev.tags;
                    
                    for(var m = 0; m < ev.viewers.length; m++) {
                        
                        const viewersid = ev.viewers[m].split(';')[1];
                        if(viewersid == userid){
                            usermap = pushUser(usermap, viewersid, 'viewer', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.approvers.length; m++) {
                        
                        const approverid = ev.approvers[m].split(';')[1];
                        if(approverid == userid && ev.makercheckers.length == 0){
                            usermap = pushUser(usermap, approverid, 'approver', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.reporters.length; m++) {
                        
                        const reporterid = ev.reporters[m].split(';')[1];
                        if(reporterid == userid){
                            usermap = pushUser(usermap, reporterid, 'reporter', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.functionheads.length; m++) {
                        
                        const functionheadid = ev.functionheads[m].split(';')[1];
                        if(functionheadid == userid){
                            usermap = pushUser(usermap, functionheadid, 'functionhead', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                    
                    for(var m = 0; m < ev.auditors.length; m++) {
                        
                        // console.log('auditors', ev.auditors, projectid);
                        const auditorid = ev.auditors[m].split(';')[1];
                        if(auditorid == userid){
                            usermap = pushUser(usermap, auditorid, 'auditor', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                        }
                    }
                }
            }
        }
    }
    
    
    
    // console.log('usermap roles', Object.keys(usermap), Object.keys(arrViewersEvents))
    usermap[userid]['roles'] = sortUsermapRoles((usermap[userid]['roles']))
    console.log('usermap roles sorted', usermap[userid]['roles'])
    // console.log('usermap', Object.keys(usermap['588602ad-1e87-4fb8-b1cf-10ac85bcd4c7']['India (Signode-Country);4ab8901c-4407-4c4d-a2c7-df1a690aa0a3']['Signode India (Signode-India-Entity);e80f8953-4bde-4fee-b944-311c551e13cd']))
    
    // await processUpdateUserMap(event["headers"]["Authorization"], userid, usermap)
    let saveUsermapBody = {
        projectid: projectid,
        userprofileid: userid,
        usermap: "\"" + JSON.stringify(usermap[userid]).replace(/"/g,'_QUOTES_') + "\""
    }
    const notifyChange = await processNotifyChange(event["headers"]["Authorization"], saveUsermapBody, '/saveusermap');
    
    const response = {statusCode: 200, body: {result: true, notifyChange: notifyChange}};
    return response;
}

function sortUsermapRoles(obj) {
  if (typeof obj !== "object" || Array.isArray(obj))
    return obj;
  const sortedObject = {};
  var ordering = {} // map for efficient lookup of sortIndex
    for (var i=0; i<ROLES_ORDER.length; i++)
        ordering[ROLES_ORDER[i]] = i;
  const keys = Object.keys(obj).sort((a,b) => {
        return (ordering[a] - ordering[b]);
  });
  keys.forEach(key => sortedObject[key] = obj[key]);
  return sortedObject;
}