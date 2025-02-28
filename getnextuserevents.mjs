// getuserevents (projectid, userprofileid)


import { KMS_KEY_REGISTER, ROLE_ALL_ROLES, ROLE_REPORTER, ROLE_APPROVER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR, BUCKET_NAME, s3Client, GetObjectCommand, BUCKET_FOLDER_REPORTING } from "./globals.mjs";
import { processIsInCurrentFincal } from './isincurrentfincal.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { getCompletenessStatus } from './getcompliancestatus.mjs'
import { Buffer } from 'buffer'

export const processGetNextUserEvents = async (event) => {
    
    console.log('inside processGetNextUserEvents');
    
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
    
    
    // const userId = "1234";
    
    var projectid = null;
    var userprofileid = null;
    var roles = null;
    var year = null;
    var page = null;
    var blocksize = null;
    var status = null;
    var list = false;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        userprofileid = JSON.parse(event.body).userprofileid.trim();
        roles = JSON.parse(event.body).roles;
        year = JSON.parse(event.body).year.trim();
        page = JSON.parse(event.body).page;
        blocksize = JSON.parse(event.body).blocksize;
        status = JSON.parse(event.body).status;
    } catch (e) {
        console.log(e)
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    try{
        list = (JSON.parse(event.body).list == "yes")
    }catch(e){
        console.log(e)
        list = false
    }
    
    console.log('inside processGetNextUserEvents 1', JSON.parse(event.body));
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(userprofileid == null || userprofileid == "" || userprofileid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "User profile id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(roles == null || roles == "" || roles.length < 1) {
        const response = {statusCode: 400, body: {result: false, error: "Roles is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(year == null || year == "" || year.length < 2) {
        const response = {statusCode: 400, body: {result: false, error: "Year is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(isNaN(page)) {
        console.log('page', page)
        const response = {statusCode: 400, body: {result: false, error: "Page is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    if(blocksize == null || blocksize == "" || blocksize.length < 1) {
        const response = {statusCode: 400, body: {result: false, error: "Block Size is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    if(status == null || status == "" || status.length < 1) {
        const response = {statusCode: 400, body: {result: false, error: "Status is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    console.log('inside processGetNextUserEvents 3');
    
    var responseS3;
    let flagEncryptedNotFound = false;
    
    const calendarList = [];
    
    for(let role of roles){
        calendarList.push(projectid + '_' + userprofileid + '_' + year + '_' + role + '_calendar_job');
    }
    
    console.log('stored calendarlist', calendarList);
    
    let assReports = {};
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
    });
    
    responseS3;
    try {
        responseS3 = await s3Client.send(command);
        const s3ResponseStream = responseS3.Body;
        const chunks = [];
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk);
        }
        const responseBuffer = Buffer.concat(chunks);
        const jsonContent = JSON.parse(responseBuffer.toString());
        assReports = jsonContent;
        
    } catch (err) {
      console.error(err); 
    }
    
    var arrEvents = {};
    var arrAllRolesEvents = {};
    
    var cnt = 0
    
    while(cnt < calendarList.length) {
        
        // console.log('cnt', cnt);
    
        let command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: calendarList[cnt] + '_enc.json',
        });
        
        responseS3;
        var storedCalendar = {};
        flagEncryptedNotFound = false 
        try {
            responseS3 = await s3Client.send(command);
            const s3ResponseStream = responseS3.Body;
            const chunks = [];
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk);
            }
            const responseBuffer = Buffer.concat(chunks);
            let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
            const jsonContent = JSON.parse(decryptedData);
            storedCalendar = jsonContent;
            
            // response = null;
            // s3ResponseStream = null;
            // chunks = null;
            // responseBuffer = null; 
            // jsonContent = null;
            
        } catch (err) {
          console.error(err); 
          flagEncryptedNotFound = true
        }
        if(flagEncryptedNotFound){
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: calendarList[cnt] + '.json',
            });
            
            responseS3;
            storedCalendar = {};
            try {
                responseS3 = await s3Client.send(command);
                const s3ResponseStream = responseS3.Body;
                const chunks = [];
                for await (const chunk of s3ResponseStream) {
                    chunks.push(chunk);
                }
                const responseBuffer = Buffer.concat(chunks);
                const jsonContent = JSON.parse(responseBuffer.toString());
                storedCalendar = jsonContent;
                
                // response = null;
                // s3ResponseStream = null;
                // chunks = null;
                // responseBuffer = null; 
                // jsonContent = null;
                
            } catch (err) {
              console.error(err);
            }
        }
        storedCalendar = sortByDate(storedCalendar)
        
        //  && i < (exclusivestartkey + 10)
        for(let role of roles){
            for(var i = 0; (i < Object.keys(storedCalendar).length); i++) {
            
                const mmddyyyy = Object.keys(storedCalendar)[i];
                
                if(mmddyyyy == "00/00") continue;
                
                const mm = mmddyyyy.split('/')[0];
                const dd = mmddyyyy.split('/')[1];
                const yyyy = mmddyyyy.split('/')[2];
                
                const calendarTime = new Date(yyyy, parseInt(mm) - 1, dd).getTime()
                let today = new Date()
                let todayMonth = today.getMonth()
                let todayDay = today.getDate()
                let todayYear = today.getFullYear()
                
                const currTime = new Date(todayYear, todayMonth, todayDay).getTime()
                if(page >= 0){
                    if(calendarTime < currTime){
                        console.log('time continue', currTime, calendarTime)
                        continue;
                    }
                } else {
                    if(calendarTime > currTime){
                        console.log('time continue negative', currTime, calendarTime)
                        continue;
                    }
                }
                console.log('time consider', todayYear, todayMonth, todayDay, calendarTime, mmddyyyy)
                // console.log('ret')
                 
                if(!processIsInCurrentFincal(mm, yyyy, year)) {
                    console.log('not in current fincal ' + mm, yyyy);
                    continue;
                }
                
                
                var entity = "";
                var entities = [];
                var locations = [];
                    
                entities = Object.keys(storedCalendar[mmddyyyy]);
                
                
                
                for(var k = 0; k < entities.length; k++) {
                    // 
                    entity = entities[k];
                    
                    console.log('entity', entity.length);
                
                    
                    if(entity.length === 36) {
                         
                            
                        locations = Object.keys(storedCalendar[mmddyyyy][entity]);
                            
                        
                        console.log('locations', locations);
                        
                        for(var j = 0; j < locations.length; j++) {
                    
                            const events = storedCalendar[mmddyyyy][entity][locations[j]];
                            // console.log('events', events.length, role, ROLE_REPORTER);
                            for(var l = 0; l < events.length; l++) {
                                
                                var pushFlag = false;
                                console.log('role', role)
                                if(role.indexOf(ROLE_REPORTER) >= 0) {
                                    // console.log('events[l]', events[l]['reportersmap'])
                                    if(events[l]['reportersmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                if(role.indexOf(ROLE_APPROVER) >= 0) {
                                    
                                    if(events[l]['approversmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                if(role.indexOf(ROLE_FUNCTION_HEAD) >= 0) {
                                    // console.log('events[l]', events[l]['functionheadsmap'])
                                    if(events[l]['functionheadsmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                if(role.indexOf(ROLE_AUDITOR) >= 0) {
                                    
                                    if(events[l]['auditorsmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                
                                if(role.indexOf(ROLE_VIEWER) >= 0) {
                                    
                                    if(events[l]['viewersmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                
                                
                                
                                if(pushFlag) {
                                    
                                    if(assReports[mmddyyyy + ';' + entity + ';' + locations[j] + ';' + events[l].id] != null) {
                                            
                                        var strData = assReports[mmddyyyy + ';' + entity + ';' + locations[j] + ';' + events[l].id];
                                        
                                        if(strData.indexOf("::") >= 0) {
                                            
                                            strData = await processDecryptData(projectid, strData);
                                            try{
                                                const jsonData = JSON.parse(strData);
                                                
                                                    
                                                events[l].documents = JSON.parse(jsonData.docs ?? "[]");
                                                events[l].comments = jsonData.comments;
                                                events[l].approved = jsonData.approved;
                                                events[l].lastupdated = jsonData.lastupdated;
                                                events[l].dateofcompletion = jsonData.dateofcompletion;
                                                
                                                if(jsonData.event != null) {
                                                    events[l].reportevent = jsonData.event;
                                                }
                                                
                                                if((mmddyyyy + ';' + entity + ';' + locations[j] + ';' + events[l].id) == "06/30/2024;c989a44e-7d3d-427e-b712-90eacf585075;38dc8c53-643f-4fee-83fe-f15239606277;362e0260-b0bf-41f9-9788-a7f680de1c3b") {
                                                    // console.log(events[l].comments);
                                                }
                                            }catch(e){
                                                console.log('error', e)
                                                events[l].documents = [];
                                                events[l].comments = [];
                                                events[l].approved = false;
                                                events[l].lastupdated = "";
                                                events[l].dateofcompletion = "";
                                            }
                                            
                                            
                                        } else {
                                            
                                            if(strData.indexOf('equal to 4096') >= 0) {
                                                events[l].documents = [];
                                                events[l].comments = [];
                                                events[l].approved = false;
                                                events[l].lastupdated = "";
                                                events[l].dateofcompletion = "";
                                                
                                            } else {
                                                
                                                if(KMS_KEY_REGISTER[projectid] != null) {
                                                    
                                                    let text;
                                                    if(isJsonString(strData)){
                                                        text = strData;
                                                    }else{
                                                        text = await processKmsDecrypt(projectid, strData);
                                                    }
                                                    console.log('inside register', text, strData);
                                                    strData = text.indexOf('Exception') >= 0 ? strData : text;
                                                    
                                                }
                                                
                                                const jsonData = JSON.parse(strData);
                                                
                                                events[l].documents = JSON.parse(jsonData.docs ?? "[]");
                                                events[l].comments = jsonData.comments;
                                                events[l].approved = jsonData.approved;
                                                events[l].lastupdated = jsonData.lastupdated;
                                                events[l].dateofcompletion = jsonData.dateofcompletion;
                                                if(jsonData.event != null) {
                                                    events[l].reportevent = jsonData.event;
                                                }
                                                
                                                
                                                
                                            }
                                            
                                        }
                                        
                                        
                                    } else {
                                        
                                        events[l].documents = [];
                                        events[l].comments = [];
                                        events[l].approved = false;
                                        events[l].lastupdated = "";
                                        events[l].dateofcompletion = "";
                                        
                                    }
                                    
                                    if(pushFlag) {
                                        
                                        if(pushFlag) {
                                            let statusFlag = (status.indexOf(getCompletenessStatus(events[l])) >= 0)
                                            if(statusFlag){
                                                if(arrEvents[role] == null){
                                                    arrEvents[role] = {}
                                                }
                                                if(arrEvents[role][mm + "/" + dd] == null) {
                                                    arrEvents[role][mm + "/" + dd] = [];
                                                }
                                                if(list){
                                                    let eventToBePushed = {}
                                                    eventToBePushed['id'] = events[l]['id']
                                                    eventToBePushed['country'] = events[l]['country']
                                                    eventToBePushed['countryname'] = events[l]['countryname']
                                                    eventToBePushed['entityname'] = events[l]['entityname']
                                                    eventToBePushed['locationname'] = events[l]['locationname']
                                                    eventToBePushed['functions'] = events[l]['functions']
                                                    eventToBePushed['obligation'] = events[l]['obligation']
                                                    eventToBePushed['obligationtitle'] = events[l]['obligationtitle']
                                                    eventToBePushed['riskarea'] = events[l]['riskarea']
                                                    eventToBePushed['risk'] = events[l]['risk']
                                                    eventToBePushed['obligationtype'] = events[l]['obligationtype']
                                                    eventToBePushed['jurisdiction'] = events[l]['jurisdiction']
                                                    eventToBePushed['frequency'] = events[l]['frequency']
                                                    eventToBePushed['subcategory'] = events[l]['subcategory']
                                                    eventToBePushed['triggers'] = events[l]['triggers']
                                                    eventToBePushed['entityid'] = events[l]['entityid']
                                                    eventToBePushed['locationid'] = events[l]['locationid']
                                                    eventToBePushed['duedate'] = events[l]['duedate']
                                                    eventToBePushed['reporters'] = events[l]['reporters']
                                                    eventToBePushed['approvers'] = events[l]['approvers']
                                                    eventToBePushed['docs'] = events[l]['docs']
                                                    eventToBePushed['makercheckers'] = events[l]['makercheckers']
                                                    eventToBePushed['lastupdated'] = events[l]['lastupdated']
                                                    eventToBePushed['reportformat'] = events[l]['reportformat']
                                                    if(eventToBePushed['reportformat'] != null && eventToBePushed['reportformat'].length > 0){
                                                        eventToBePushed['docs'] = ['Not Required'];
                                                    }
                                                    //Reporting Fields
                                                    eventToBePushed['comments'] = []
                                                    for(let eventComment of events[l]['comments']){
                                                        eventToBePushed['comments'].push({author: eventComment['author'], timestamp: eventComment['timestamp'], comment: eventComment['comment']})
                                                    }
                                                    eventToBePushed['approved'] = events[l]['approved']
                                                    eventToBePushed['dateofcompletion'] = events[l]['dateofcompletion']
                                                    eventToBePushed['documents'] = [] 
                                                    for(let eventDocument of events[l]['documents']){
                                                        eventToBePushed['documents'].push({key: eventDocument['key'], ext: eventDocument['ext']})
                                                    }
                                                      
                                                    arrEvents[role][mm + "/" + dd].push(eventToBePushed);    
                                                }else{
                                                    if(events[l]['reportformat'] != null && events[l]['reportformat'].length > 0){
                                                        events[l]['docs'] = ['Not Required'];
                                                    }
                                                    arrEvents[role][mm + "/" + dd].push(events[l]);
                                                }
                                                // arrEvents[role][mm + "/" + dd].push(events[l]);
                                                if(role.indexOf(ROLE_ALL_ROLES) >= 0) {
                                                    if(arrAllRolesEvents[mm + "/" + dd] == null) {
                                                        arrAllRolesEvents[mm + "/" + dd] = [];
                                                    }
                                                    if(list){
                                                        let eventToBePushed = {}
                                                        eventToBePushed['id'] = events[l]['id']
                                                        eventToBePushed['country'] = events[l]['country']
                                                        eventToBePushed['countryname'] = events[l]['countryname']
                                                        eventToBePushed['entityname'] = events[l]['entityname']
                                                        eventToBePushed['locationname'] = events[l]['locationname']
                                                        eventToBePushed['functions'] = events[l]['functions']
                                                        eventToBePushed['obligation'] = events[l]['obligation']
                                                        eventToBePushed['obligationtitle'] = events[l]['obligationtitle']
                                                        eventToBePushed['riskarea'] = events[l]['riskarea']
                                                        eventToBePushed['risk'] = events[l]['risk']
                                                        eventToBePushed['obligationtype'] = events[l]['obligationtype']
                                                        eventToBePushed['jurisdiction'] = events[l]['jurisdiction']
                                                        eventToBePushed['frequency'] = events[l]['frequency']
                                                        eventToBePushed['subcategory'] = events[l]['subcategory']
                                                        eventToBePushed['triggers'] = events[l]['triggers']
                                                        eventToBePushed['entityid'] = events[l]['entityid']
                                                        eventToBePushed['locationid'] = events[l]['locationid']
                                                        eventToBePushed['duedate'] = events[l]['duedate']
                                                        eventToBePushed['reporters'] = events[l]['reporters']
                                                        eventToBePushed['approvers'] = events[l]['approvers']
                                                        eventToBePushed['docs'] = events[l]['docs']
                                                        eventToBePushed['makercheckers'] = events[l]['makercheckers']
                                                        eventToBePushed['lastupdated'] = events[l]['lastupdated']
                                                        eventToBePushed['reportformat'] = events[l]['reportformat']
                                                        if(eventToBePushed['reportformat'] != null && eventToBePushed['reportformat'].length > 0){
                                                            eventToBePushed['docs'] = ['Not Required'];
                                                        }
                                                        
                                                        //Reporting Fields
                                                        eventToBePushed['comments'] = []
                                                        for(let eventComment of events[l]['comments']){
                                                            eventToBePushed['comments'].push({author: eventComment['author'], timestamp: eventComment['timestamp'], comment: eventComment['comment']})
                                                        }
                                                        eventToBePushed['approved'] = events[l]['approved']
                                                        eventToBePushed['dateofcompletion'] = events[l]['dateofcompletion']
                                                        eventToBePushed['documents'] = [] 
                                                        for(let eventDocument of events[l]['documents']){
                                                            eventToBePushed['documents'].push({key: eventDocument['key'], ext: eventDocument['ext']})
                                                        }
                                                          
                                                        arrAllRolesEvents[mm + "/" + dd].push(eventToBePushed);    
                                                    }else{
                                                        if(events[l]['reportformat'] != null && events[l]['reportformat'].length > 0){
                                                            events[l]['docs'] = ['Not Required'];
                                                        }
                                                        arrAllRolesEvents[mm + "/" + dd].push(events[l]);
                                                    }
                                                    // arrAllRolesEvents[mm + "/" + dd].push(events[l]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        cnt++; 
    }
    for(let role of Object.keys(arrEvents)){
        console.log('arrEvents dates', Object.keys(arrEvents[role]))
        if(page >= 0){
            arrEvents[role] = sortByDateArr(arrEvents[role])
        }else{
            arrEvents[role] = sortByDateArrReverse(arrEvents[role])
        }
        console.log('arrEvents dates sorted', Object.keys(arrEvents[role]))
    }
    let returnArr = {}
    for(let role of roles){
        if(returnArr[role] == null){
            returnArr[role] = {}
        }
    }
    for(let role of Object.keys(arrEvents)){
        let flagBreak = false;
        let pushCount = 0;
        let pageCount = page * blocksize;
        let nextPageCount = (page + 1) * blocksize;
        if(page < 0){
            pageCount = (-page - 1) * blocksize
            nextPageCount = (-page) * blocksize
        }
        console.log('pageCount', pageCount, 'nextPageCount', nextPageCount);
        for(let dateStr of Object.keys(arrEvents[role])){
            for(let event of arrEvents[role][dateStr]){
                if(pushCount >= pageCount){
                    if(returnArr[role] == null){
                        returnArr[role] = {}
                    }
                    if(returnArr[role][dateStr] == null){
                        returnArr[role][dateStr] = []
                    }
                    returnArr[role][dateStr].push(event)
                }
                pushCount++
                if(pushCount >= nextPageCount){
                    flagBreak = true;
                    break;
                }
            }
            if(flagBreak){
                break;
            }
        }
    }
    if(roles.indexOf(ROLE_ALL_ROLES) >= 0) {
        console.log('before sorting', Object.keys(arrAllRolesEvents))
        if(page >= 0){
            arrAllRolesEvents = sortByDateArr(arrAllRolesEvents)
        } else{
            arrAllRolesEvents = sortByDateArrReverse(arrAllRolesEvents)
        }
        console.log('after sorting', Object.keys(arrAllRolesEvents))
        if(roles.length > 1){
            let flagBreak = false;
            let pushCount = 0;
            let pageCount = page * blocksize;
            for(let dateStr of Object.keys(arrAllRolesEvents)){
                for(let event of arrAllRolesEvents[dateStr]){
                    if(pushCount >= pageCount){
                        if(returnArr[ROLE_ALL_ROLES] == null){
                            returnArr[ROLE_ALL_ROLES] = {}
                        }
                        if(returnArr[ROLE_ALL_ROLES][dateStr] == null){
                            returnArr[ROLE_ALL_ROLES][dateStr] = []
                        }
                        returnArr[ROLE_ALL_ROLES][dateStr].push(event)
                    }
                    pushCount++
                    if(pushCount >= ((page + 1) * blocksize)){
                        flagBreak = true;
                        break;
                    }
                }
                if(flagBreak){
                    break;
                }
            }
        }
    }
    const response = {statusCode: 200, body: {result: true, data: returnArr}};
    return response;
    
}

function sortByDate(obj) {
  if (typeof obj !== "object" || Array.isArray(obj))
    return obj;
  const sortedObject = {};
  const keys = Object.keys(obj).sort((a,b) => {
        const mm = a.split('/')[0];
        const dd = a.split('/')[1];
        const yyyy = a.split('/')[2];
        
        const calendarTime = new Date(yyyy, parseInt(mm) - 1, dd).getTime()
        const mmb = b.split('/')[0];
        const ddb = b.split('/')[1];
        const yyyyb = b.split('/')[2];
        
        const calendarTimeb = new Date(yyyyb, parseInt(mmb) - 1, ddb).getTime()
        
        return calendarTime - calendarTimeb
  });
  keys.forEach(key => sortedObject[key] = obj[key]);
  return sortedObject;
}

function sortByDateArr(obj) {
  if (typeof obj !== "object" || Array.isArray(obj))
    return obj;
  const sortedObject = {};
  const keys = Object.keys(obj).sort((a,b) => {
        const mm = a.split('/')[0];
        const dd = a.split('/')[1];
        const yyyy = ((parseInt(mm) < new Date().getMonth()) ? (new Date().getFullYear() + 1) : ( (parseInt(mm) != new Date().getMonth()) ? ( new Date().getFullYear()) : parseInt(dd) < new Date().getDate() ? (new Date().getFullYear() + 1) : (new Date().getFullYear())));
        
        const calendarTime = new Date(yyyy, parseInt(mm) - 1, dd).getTime()
        const mmb = b.split('/')[0];
        const ddb = b.split('/')[1];
        const yyyyb = ((parseInt(mmb) < new Date().getMonth()) ? (new Date().getFullYear() + 1) : ( (parseInt(mmb) != new Date().getMonth()) ? ( new Date().getFullYear()) :  parseInt(ddb) < new Date().getDate() ? (new Date().getFullYear() + 1) : (new Date().getFullYear())));
        
        const calendarTimeb = new Date(yyyyb, parseInt(mmb) - 1, ddb).getTime()
        
        return calendarTime - calendarTimeb
  });
  keys.forEach(key => sortedObject[key] = obj[key]);
  return sortedObject;
}
function sortByDateArrReverse(obj) {
  if (typeof obj !== "object" || Array.isArray(obj))
    return obj;
  const sortedObject = {};
  const keys = Object.keys(obj).sort((a,b) => {
        const mm = a.split('/')[0];
        const dd = a.split('/')[1];
        const yyyy = ((parseInt(mm) > new Date().getMonth() + 1) ? (new Date().getFullYear() - 1) : ( (parseInt(mm) != new Date().getMonth() + 1) ? ( new Date().getFullYear()) : parseInt(dd) > new Date().getDate() ? (new Date().getFullYear() - 1) : (new Date().getFullYear())));
        
        const calendarTime = new Date(yyyy, parseInt(mm) - 1, dd).getTime()
        
        const mmb = b.split('/')[0];
        const ddb = b.split('/')[1];
        const yyyyb = ((parseInt(mmb) > new Date().getMonth() + 1) ? (new Date().getFullYear() - 1) : ( (parseInt(mmb) != new Date().getMonth() + 1) ? ( new Date().getFullYear()) :  parseInt(ddb) > new Date().getDate() ? (new Date().getFullYear() - 1) : (new Date().getFullYear())));
        
        const calendarTimeb = new Date(yyyyb, parseInt(mmb) - 1, ddb).getTime()
        
        return calendarTimeb - calendarTime
  });
  keys.forEach(key => sortedObject[key] = obj[key]);
  return sortedObject;
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        console.log('error', e)
        return false;
    }
    return true;
}