// getuserevents (projectid, userprofileid)


import { getSignedUrl, KMS_KEY_REGISTER, ROLE_REPORTER, ROLE_APPROVER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR, BUCKET_NAME, s3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand, VIEW_COUNTRY, VIEW_ENTITY, VIEW_LOCATION, VIEW_TAG, BUCKET_FOLDER_REPORTING, EVENTS_LIST_CONCISE_THRESHOLD } from "./globals.mjs";
import { processIsInCurrentFincal } from './isincurrentfincal.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { processAddLog } from './addlog.mjs';
import { processAddUserLastTime } from './adduserlasttime.mjs'
import { Buffer } from "buffer";
export const processGetAllCountryEvents = async (event) => {
    
    console.log('inside processGetAllCountryEvents');
    
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
    
    const userId = authResult.userId;
    
    // const userId = "1234";
    console.log('here userid', userId)
    var projectid = null;
    var entityid = null;
    var locationid = null;
    var tagid = null;
    var userprofileid = null;
    var role = null;
    var countryid = null;
    var adhoc = null;
    var exclusivestartkey = null;
    var sdate = null;
    var edate = null;
    var view = null;
    var year = null;
    var searchstring = null;
    var list = false;
    var month = "00";
    var fullmmddyyyy = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        entityid = JSON.parse(event.body).entityid.trim();
        locationid = JSON.parse(event.body).locationid.trim();
        tagid = JSON.parse(event.body).tagid.trim();
        userprofileid = JSON.parse(event.body).userprofileid;
        role = JSON.parse(event.body).role.trim();
        countryid = JSON.parse(event.body).countryid.trim();
        adhoc = JSON.parse(event.body).adhoc;
        exclusivestartkey = JSON.parse(event.body).exclusivestartkey;
        sdate = JSON.parse(event.body).sdate;
        edate = JSON.parse(event.body).edate;
        view = JSON.parse(event.body).view;
        searchstring = JSON.parse(event.body).searchstring;
        year = JSON.parse(event.body).year.trim();
    } catch (e) {
        console.log('params error', e)
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    try{
        list = (JSON.parse(event.body).list == "yes")
    }catch(e){
        console.log('list error', e)
        list = false
    }
    try{
        month = (JSON.parse(event.body).month)
    }catch(e){
        console.log('month error', e)
        month = "00"
    }
    try{
        fullmmddyyyy = (JSON.parse(event.body).mmddyyyy)
    }catch(e){
        console.log('fullmmddyyyy error', e)
        fullmmddyyyy = null;
    }
    
    console.log('inside processGetAllCountryEvents 1', list);
    
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
    
    if(role == null || role == "" || role.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Role is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(adhoc == null) {
        const response = {statusCode: 400, body: {result: false, error: "Adhoc is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(sdate == null) {
        const response = {statusCode: 400, body: {result: false, error: "Start date is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(edate == null) {
        const response = {statusCode: 400, body: {result: false, error: "End date is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(view == null) {
        const response = {statusCode: 400, body: {result: false, error: "View value is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(year == null || year == "" || year.length < 2) {
        const response = {statusCode: 400, body: {result: false, error: "Year is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    console.log('inside processGetAllCountryEvents 2');
    
    // var getParams = {
    //     TableName: TABLE,
    //     Key: {
    //       projectid: { S: projectid },
    //     },
    // };
    console.log('inside processGetAllCountryEvents 3');
    const calendarList = [];
    let flagMonthlyFileNotFound = false;
    if(month != "00"){
        let userMonthlyFileKey = projectid + '_' + userprofileid + '_' + year + '_' + role +'_calendar_' + month + '_job_enc.json'
        console.log('userMonthlyFileKey', userMonthlyFileKey)
        var command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: userMonthlyFileKey,
        });
        
        responseS3;
        var storedTagsManifest = {};
        try {
            responseS3 = await s3Client.send(command);
            const s3ResponseStream = responseS3.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
            const jsonContent = JSON.parse(decryptedData);
            console.log('jsonContent', jsonContent.length)       
        } catch (err) {
          console.log('monthly read error', err);
          flagMonthlyFileNotFound = true
        }
        if(!flagMonthlyFileNotFound){
            console.log()
            calendarList.push(projectid + '_' + userprofileid + '_' + year + '_' + role +'_calendar_' + month + '_job')
        }
    }
    if(month == "00" || flagMonthlyFileNotFound){
        let userFileKey = projectid + '_' + userprofileid + '_' + year + '_' + role +'_calendar_job_enc.json'
        let flagUserFileNotFound = false;
        
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: userFileKey,
        });
        
        responseS3;
        storedTagsManifest = {};
        try {
            responseS3 = await s3Client.send(command);
            const s3ResponseStream = responseS3.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
            const jsonContent = JSON.parse(decryptedData);
            console.log('jsonContent', jsonContent.length)
        } catch (err) {
          console.log(err);
          flagUserFileNotFound = true
        }
        
        if(!flagUserFileNotFound){
            calendarList.push(projectid + '_' + userprofileid + '_' + year + '_' + role + '_calendar_job');
        }else{
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_manifest_id_calendar_job_enc.json',
            });
            
            var responseS3;
            var storedManifest = {};
            let flagEncryptedNotFound = false
            try {
                responseS3 = await s3Client.send(command);
                console.log('inside processGetAllCountryEvents 3a');
                const s3ResponseStream = responseS3.Body;
                console.log('inside processGetAllCountryEvents 3b');
                const chunks = []
                for await (const chunk of s3ResponseStream) {
                    chunks.push(chunk)
                }
                console.log('inside processGetAllCountryEvents 3c');
                const responseBuffer = Buffer.concat(chunks)
                console.log('inside processGetAllCountryEvents 3d');
                let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
                const jsonContent = JSON.parse(decryptedData);
                console.log('inside processGetAllCountryEvents 3e');
                storedManifest = jsonContent;
                
                
            } catch (err) {
              console.error(err);
              flagEncryptedNotFound = true;
            } 
            console.log('flagEncryptedNotFound', flagEncryptedNotFound)
            if(flagEncryptedNotFound){
                command = new GetObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: projectid + '_manifest_id_calendar_job.json',
                });
                
                responseS3;
                storedManifest = {};
                
                try {
                    responseS3 = await s3Client.send(command);
                    
                    const s3ResponseStream = responseS3.Body;
                    
                    const chunks = []
                    for await (const chunk of s3ResponseStream) {
                        chunks.push(chunk)
                    }
                    
                    const responseBuffer = Buffer.concat(chunks)
                    
                    const jsonContent = JSON.parse(responseBuffer.toString());
                    
                    storedManifest = jsonContent;
                    
                    
                } catch (err) {
                  console.error(err); 
                } 
            }
             
            
            console.log('inside processGetAllCountryEvents 4', storedManifest);
        
        
        
            if(view == VIEW_LOCATION) {
                
                calendarList.push(projectid + '_' + locationid + '_' + year + '_calendar_job');
                
            }
            
            if(view == VIEW_ENTITY) {
                
                for(var cntManifest = 0; cntManifest < Object.keys(storedManifest).length; cntManifest++) {
                    
                    const country = Object.keys(storedManifest)[cntManifest];
                    for(var cntEntities = 0; cntEntities < Object.keys(storedManifest[country]).length; cntEntities++) {
                        
                        const entity = Object.keys(storedManifest[country])[cntEntities];
                        if(entity == entityid) {
                            for(var cntLocations = 0; cntLocations < Object.keys(storedManifest[country][entity]).length; cntLocations++) {
                                
                                const location = Object.keys(storedManifest[country][entity])[cntLocations];
                                calendarList.push(projectid + '_' + location + '_' + year + '_calendar_job');
                                
                            }
                        }
                        
                    }
                    
                }
                
            }
            
            if(view == VIEW_COUNTRY) {
                
                for(cntManifest = 0; cntManifest < Object.keys(storedManifest).length; cntManifest++) {
                    
                    const country = Object.keys(storedManifest)[cntManifest];
                    
                    if(country == countryid) {
                        for(cntEntities = 0; cntEntities < Object.keys(storedManifest[country]).length; cntEntities++) {
                            
                            const entity = Object.keys(storedManifest[country])[cntEntities];
                            for(cntLocations = 0; cntLocations < Object.keys(storedManifest[country][entity]).length; cntLocations++) {
                                
                                const location = Object.keys(storedManifest[country][entity])[cntLocations];
                                calendarList.push(projectid + '_' + location + '_' + year + '_calendar_job');
                                
                            }
                            
                        }
                    }
                    
                }
                
            }
            
            if(view == VIEW_TAG) {
                
                if(tagid == "allevents"){
                    for(cntManifest = 0; cntManifest < Object.keys(storedManifest).length; cntManifest++) {
                    
                        const country = Object.keys(storedManifest)[cntManifest];
                        // const tag = Object.keys(storedTagsManifest)[cntManifest];
                        // calendarList.push(projectid + '_' + tag + '_'+ year + '_calendar_job');
                        for(cntEntities = 0; cntEntities < Object.keys(storedManifest[country]).length; cntEntities++) {
                            
                            const entity = Object.keys(storedManifest[country])[cntEntities];
                            for(cntLocations = 0; cntLocations < Object.keys(storedManifest[country][entity]).length; cntLocations++) {
                                
                                const location = Object.keys(storedManifest[country][entity])[cntLocations];
                                calendarList.push(projectid + '_' + location + '_'+ year + '_calendar_job');
                                
                            }
                            
                        }
                        
                    }
                }else{
                
                    command = new GetObjectCommand({
                      Bucket: BUCKET_NAME,
                      Key: projectid + '_tags_manifest_id_calendar_job_enc.json',
                    });
                    
                    responseS3;
                    storedTagsManifest = {};
                    let flagNotFound = false
                    try {
                        responseS3 = await s3Client.send(command);
                        const s3ResponseStream = responseS3.Body;
                        const chunks = []
                        for await (const chunk of s3ResponseStream) {
                            chunks.push(chunk)
                        }
                        const responseBuffer = Buffer.concat(chunks)
                        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
                        const jsonContent = JSON.parse(decryptedData);
                        storedTagsManifest = jsonContent;
                        
                        
                    } catch (err) {
                      console.log(err);
                      flagNotFound = true
                    }
                    if(flagNotFound){
                        for(cntManifest = 0; cntManifest < Object.keys(storedManifest).length; cntManifest++) {
                        
                            const country = Object.keys(storedManifest)[cntManifest];
                            // const tag = Object.keys(storedTagsManifest)[cntManifest];
                            // calendarList.push(projectid + '_' + tag + '_'+ year + '_calendar_job');
                            for(cntEntities = 0; cntEntities < Object.keys(storedManifest[country]).length; cntEntities++) {
                                
                                const entity = Object.keys(storedManifest[country])[cntEntities];
                                for(cntLocations = 0; cntLocations < Object.keys(storedManifest[country][entity]).length; cntLocations++) {
                                    
                                    const location = Object.keys(storedManifest[country][entity])[cntLocations];
                                    calendarList.push(projectid + '_' + location + '_'+ year + '_calendar_job');
                                    
                                }
                                
                            }
                            
                        }
                    }else{
                        console.log('storedTagsManifest', storedTagsManifest)
                        for(cntManifest = 0; cntManifest < Object.keys(storedTagsManifest).length; cntManifest++) {
                            if(Object.keys(storedTagsManifest)[cntManifest] == tagid){
                                const tag = Object.keys(storedTagsManifest)[cntManifest];
                                calendarList.push(projectid + '_' + tag + '_'+ year + '_calendar_job');
                            }
                            
                        }
                    }
                }
            }
        }
    }
    
    console.log('stored calendarlist', calendarList);
    
    let assReports = {};
    let flagMonthlyReportFileNotFound = true;
    
    if(month != "00"){
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + month + "_enc.json",
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
            flagMonthlyReportFileNotFound = false;
        } catch (err) {
          console.error(err); 
          flagMonthlyReportFileNotFound = true;
        }
    }
    if(month == "00" || flagMonthlyReportFileNotFound){
        command = new GetObjectCommand({
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
    }
    
    var arrEvents = {};
    var arrEventsConcise = {};
    let totalCount = 0;
    var cnt = exclusivestartkey
    while(cnt < calendarList.length) {
        
        // console.log('cnt', cnt);
    
        let command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: calendarList[cnt] + '_enc.json',
        });
        
        responseS3;
        var storedCalendar = {};
        let flagEncryptedNotFound = false 
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
        // console.log('storedCalendar', Object.keys(storedCalendar))
        //  && i < (exclusivestartkey + 10)
        for(var i = 0; (i < Object.keys(storedCalendar).length); i++) {
        
            const mmddyyyy = Object.keys(storedCalendar)[i];
            
            if(mmddyyyy == "00/00") continue;
            if(fullmmddyyyy != null && mmddyyyy != fullmmddyyyy) continue;
            
            const mm = mmddyyyy.split('/')[0];
            const dd = mmddyyyy.split('/')[1];
            const yyyy = mmddyyyy.split('/')[2];
            
            const startTime = new Date(sdate.split('/')[2], parseInt(sdate.split('/')[0]-1), sdate.split('/')[1]).getTime();
            const endTime = new Date(edate.split('/')[2], parseInt(edate.split('/')[0]-1), edate.split('/')[1]).getTime();
            const currTime = new Date(yyyy, parseInt(mm) - 1, dd).getTime()
            
            

            if(currTime > endTime || currTime < startTime) {
                
                continue;
            }
            
            // console.log('ret')
             
            if(!processIsInCurrentFincal(mm, yyyy, year)) {
                // console.log('not in current fincal ' + mm, yyyy);
                continue;
            }
            
            
            var entity = "";
            var entities = [];
            var locations = [];
                
            var conditionCheck = false;
            
            if(view == VIEW_COUNTRY) {
                conditionCheck = (storedCalendar[mmddyyyy]['countries'][countryid] != null)
                if(conditionCheck) {
                    if(Array.isArray(storedCalendar[mmddyyyy]['countries'][countryid])){
                        locations = []
                        for(let countryEntityId of storedCalendar[mmddyyyy]['countries'][countryid]){
                            for(let entityLocationId of Object.keys(storedCalendar[mmddyyyy][countryEntityId])){
                                // console.log('countryEntityId', countryEntityId, 'entityLocationId', entityLocationId);
                                if(entities.indexOf(countryEntityId) < 0){
                                    entities.push(countryEntityId)
                                }
                                if(locations.indexOf(entityLocationId) < 0){
                                    locations.push(entityLocationId)
                                }
                            }
                        }
                    }else{
                        entities.push(storedCalendar[mmddyyyy]['countries'][countryid]);
                        locations = Object.keys(storedCalendar[mmddyyyy][storedCalendar[mmddyyyy]['countries'][countryid]]);    
                    }
                    
                }
                
            }
            
            if(view == VIEW_ENTITY) {
                conditionCheck = (storedCalendar[mmddyyyy][entityid] != null)
                if(conditionCheck) {
                    entities.push(entityid);
                    locations = Object.keys(storedCalendar[mmddyyyy][entityid]);    
                }
            } 
            
            if(view == VIEW_LOCATION) {
                // console.log(mmddyyyy, entityid, locationid);
                if(storedCalendar[mmddyyyy][entityid] != null) {
                    conditionCheck = (storedCalendar[mmddyyyy][entityid][locationid] != null)
                    if(conditionCheck) {
                        entities.push(entityid);
                        locations = [locationid];    
                    }    
                }
                
            } 
            
            if(view == VIEW_TAG) {
                conditionCheck = true;
                entities = Object.keys(storedCalendar[mmddyyyy]);
            } 
            
            
            
            if(conditionCheck) {
                
                // console.log('entities', entities);
                
                for(var k = 0; k < entities.length; k++) {
                    // 
                    entity = entities[k];
                    
                    // console.log('entity', entity.length);
                
                    
                    if(entity.length === 36) {
                         
                        if(view == VIEW_TAG) {
                            
                            locations = Object.keys(storedCalendar[mmddyyyy][entity]);
                            // console.log('locations', locations)
                            
                        }
                        
                        // console.log('locations', locations);
                        
                        for(var j = 0; j < locations.length; j++) {
                    
                            const events = storedCalendar[mmddyyyy][entity][locations[j]];
                            // console.log('events', mmddyyyy, entity, locations[j]) ;
                            if(events == null){
                                continue
                            }
                            for(var l = 0; l < events.length; l++) {
                                
                                var pushFlag = false;
                                
                                if(role == ROLE_REPORTER) {
                                    // console.log('events[l]', events[l]['reportersmap'])
                                    if(events[l]['reportersmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                if(role == ROLE_APPROVER) {
                                    
                                    if(events[l]['approversmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                if(role == ROLE_FUNCTION_HEAD) {
                                    // console.log('events[l]', events[l]['functionheadsmap'])
                                    if(events[l]['functionheadsmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                if(role == ROLE_AUDITOR) {
                                    
                                    if(events[l]['auditorsmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                
                                if(role == ROLE_VIEWER) {
                                    
                                                        
            
                                    // console.log('in current fincal', events[l]['viewersmap']);
            
            
                                    
                                    if(events[l]['viewersmap'][userprofileid] != null) {
                                        pushFlag = true;
                                    }
                                    
                                }
                                
                                if(pushFlag && view == VIEW_TAG) {
                                    // console.log('pushFlag', pushFlag, tagid)
                                    if(tagid != "allevents") {
                                        if(events[l]['tagsmap'][tagid] == null) {
                                            pushFlag = false;
                                        }
                                    }
                                    
                                }
                                
                                
                                
                                if(pushFlag) {
                                    
                                    if(searchstring != null && searchstring.length > 0) {
                                        searchstring = searchstring.toLowerCase()
                                        if(events[l].obligationtitle.toLowerCase().indexOf(searchstring) >= 0
                                            || events[l].obligation.toLowerCase().indexOf(searchstring) >= 0
                                            || events[l].internalcontrols.toLowerCase().indexOf(searchstring) >= 0
                                            || events[l].obligation.toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].statute + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].category + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].subcategory + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].reference + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].authority + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].frequency + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].subfrequency + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].obligationtype + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].form + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].firstlineofdefence + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].secondlineofdefence + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].thirdlineofdefence + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].risk + "").toLowerCase().indexOf(searchstring) >= 0
                                            || (events[l].riskarea + "").toLowerCase().indexOf(searchstring) >= 0
                                            ) {
                                                console.log('searchstring', searchstring, events[l].obligationtitle)
                                        } else {
                                            pushFlag = false;
                                        }
                                    
                                        
                                    }
                                    
                                    // console.log('reports', Object.keys(assReports), mmddyyyy + ';' + entity + ';' + locations[j] + ';' + events[l].id)
                                    if(assReports[mmddyyyy + ';' + entity + ';' + locations[j] + ';' + events[l].id] != null) {
                                            
                                        var strData = assReports[mmddyyyy + ';' + entity + ';' + locations[j] + ';' + events[l].id];
                                        
                                        if(strData.indexOf("::") >= 0) {
                                            
                                            strData = await processDecryptData(projectid, strData);
    
                                            try{                                            
                                                const jsonData = JSON.parse(strData);
                                                
                                                // console.log('jsonData',jsonData, mmddyyyy)    
                                                events[l].documents = JSON.parse(jsonData.docs ?? "[]");
                                                events[l].comments = jsonData.comments;
                                                events[l].approved = jsonData.approved;
                                                events[l].percentage = jsonData.percentage;
                                                events[l].lastupdated = jsonData.lastupdated;
                                                events[l].dateofcompletion = jsonData.dateofcompletion;
                                                
                                                if(jsonData.event != null) {
                                                    events[l].reportevent = jsonData.event;
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
                                                    // console.log('inside register', text, strData);
                                                    strData = text.indexOf('Exception') >= 0 ? strData : text;
                                                    
                                                }
                                                
                                                const jsonData = JSON.parse(strData);
                                                
                                                events[l].documents = JSON.parse(jsonData.docs ?? "[]");
                                                events[l].comments = jsonData.comments;
                                                events[l].approved = jsonData.approved;
                                                events[l].percentage = jsonData.percentage;
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
                                            if(arrEvents[mm + "/" + dd] == null) {
                                                arrEvents[mm + "/" + dd] = [];
                                            }
                                            if(arrEventsConcise[mm + "/" + dd] == null) {
                                                arrEventsConcise[mm + "/" + dd] = [];
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
                                                eventToBePushed['uploadguidance'] = events[l]['uploadguidance'] == null ? 0 : 1
                                                if(eventToBePushed['reportformat'] != null && eventToBePushed['reportformat'].length > 0){
                                                    eventToBePushed['docs'] = ['Not Required'];
                                                }
                                                eventToBePushed['comments'] = []
                                                for(let eventComment of events[l]['comments'] ?? []){
                                                    eventToBePushed['comments'].push({author: eventComment['author'], timestamp: eventComment['timestamp'], comment: eventComment['comment']})
                                                }
                                                eventToBePushed['approved'] = events[l]['approved']
                                                eventToBePushed['percentage'] = events[l]['percentage']
                                                eventToBePushed['dateofcompletion'] = events[l]['dateofcompletion']
                                                eventToBePushed['documents'] = [] 
                                                for(let eventDocument of events[l]['documents'] ?? []){
                                                    eventToBePushed['documents'].push({key: eventDocument['key'], ext: eventDocument['ext']})
                                                }
                                                  
                                                arrEvents[mm + "/" + dd].push(eventToBePushed);
                                                let eventConcise = {}
                                                eventConcise['id'] = events[l]['id']
                                                eventConcise['obligationtitle'] = events[l]['obligationtitle']
                                                eventConcise['locationname'] = events[l]['locationname']
                                                eventConcise['entityid'] = events[l]['entityid']
                                                eventConcise['locationid'] = events[l]['locationid']
                                                eventConcise['duedate'] = events[l]['duedate']
                                                eventConcise['riskarea'] = events[l]['riskarea']
                                                eventConcise['risk'] = events[l]['risk']
                                                eventConcise['functions'] = events[l]['functions']
                                                eventConcise['obligationtype'] = events[l]['obligationtype']
                                                eventConcise['jurisdiction'] = events[l]['jurisdiction']
                                                eventConcise['frequency'] = events[l]['frequency']
                                                eventConcise['subcategory'] = events[l]['subcategory']
                                                eventConcise['docs'] = events[l]['docs']
                                                eventConcise['makercheckers'] = events[l]['makercheckers']
                                                eventConcise['uploadguidance'] = events[l]['uploadguidance'] == null ? 0 : 1
                                                eventConcise['comments'] = []
                                                for(let eventComment of events[l]['comments'] ?? []){
                                                    eventConcise['comments'].push({author: eventComment['author'], timestamp: eventComment['timestamp'], comment: eventComment['comment']})
                                                }
                                                eventConcise['approved'] = events[l]['approved']
                                                eventConcise['percentage'] = events[l]['percentage']
                                                arrEventsConcise[mm + "/" + dd].push(eventConcise);
                                                totalCount ++;    
                                            }else{
                                                if(events[l]['reportformat'] != null && events[l]['reportformat'].length > 0){
                                                    events['docs'] = ['Not Required'];
                                                }
                                                arrEvents[mm + "/" + dd].push(events[l]);
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
    
    // console.log(arrEvents);
    
    const currTs = new Date().getTime();
    const fileKey = projectid + '_' + currTs + '_view_job.json';
    if(totalCount > EVENTS_LIST_CONCISE_THRESHOLD && fullmmddyyyy == null){
        arrEvents = arrEventsConcise
    }
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: JSON.stringify(arrEvents),
      ContentType: 'application/json'
    });
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
      console.error(err);
    }
    
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    
    const signedUrlGet = await getSignedUrl(s3Client, command, { expiresIn: 1800 });
    
    command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    const signedUrlDelete = await getSignedUrl(s3Client, command, { expiresIn: 1800 });
    await processAddUserLastTime(projectid, userprofileid, 'lastactive')
    const response = {statusCode: 200, body: {result: true, signedUrlGet: signedUrlGet, signedUrlDelete: signedUrlDelete, lastEvaluatedKey: cnt === calendarList.length ? null : cnt}};
    await processAddLog('1234','details', event, response, response.statusCode)
    // const response = {statusCode: 200, body: {result: true, events: arrEvents}};
    return response;
    
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
