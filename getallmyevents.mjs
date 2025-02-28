// getuserevents (projectid, userprofileid)


import { ROLE_REPORTER, ROLE_APPROVER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR, s3Client, GetObjectCommand, BUCKET_NAME, VIEW_COUNTRY, VIEW_ENTITY, VIEW_LOCATION, VIEW_TAG } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { Buffer } from 'buffer'

export const processGetAllMyEvents = async (event) => {
    
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
    var entityid = null;
    var locationid = null;
    var tagid = null;
    var userprofileid = null;
    var role = null;
    var countryid = null;
    var view = null;
    var year = null;
    var searchstring = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        entityid = JSON.parse(event.body).entityid.trim();
        locationid = JSON.parse(event.body).locationid.trim();
        tagid = JSON.parse(event.body).tagid.trim();
        userprofileid = JSON.parse(event.body).userprofileid.trim();
        role = JSON.parse(event.body).role.trim();
        countryid = JSON.parse(event.body).countryid.trim();
        view = JSON.parse(event.body).view;
        searchstring = JSON.parse(event.body).searchstring;
        year = JSON.parse(event.body).year.trim();
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
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
        const response = {statusCode: 400, body: {result: false, error: "Mode is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    let command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_manifest_id_calendar_job_enc.json',
    });
    
    var responseS3;
    var storedManifest = {};
    let flagEncryptedNotFound = false
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
        storedManifest = jsonContent;
    } catch (err) {
      console.error(err); 
      flagEncryptedNotFound = true
    } 
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
    const calendarList = [];
    
    let userFileKey = projectid + '_' + userprofileid + '_' + year + '_' + role +'_calendar_job_enc.json'
    let flagUserFileNotFound = false;
    
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: userFileKey,
    });
    
    responseS3;
    
    if(!flagUserFileNotFound){
        calendarList.push(projectid + '_' + userprofileid + '_' + year + '_' + role + '_calendar_job');
    }else{
    
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
            
            for(cntManifest = 0; cntManifest < Object.keys(storedManifest).length; cntManifest++) {
                
                const country = Object.keys(storedManifest)[cntManifest];
                
                for(cntEntities = 0; cntEntities < Object.keys(storedManifest[country]).length; cntEntities++) {
                    
                    const entity = Object.keys(storedManifest[country])[cntEntities];
                    for(cntLocations = 0; cntLocations < Object.keys(storedManifest[country][entity]).length; cntLocations++) {
                        
                        const location = Object.keys(storedManifest[country][entity])[cntLocations];
                        calendarList.push(projectid + '_' + location + '_'+ year + '_calendar_job');
                        
                    }
                    
                }
                
            }
            
        }
    }
    
    var arrEvents = {};
    
    var cnt = 0;
    while(cnt < calendarList.length) {
        
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

        } catch (err) {
          console.error(err); 
          flagEncryptedNotFound = true;
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
    
            } catch (err) {
              console.error(err); 
            }    
        }
        console.log('storedCalendar', Object.keys(storedCalendar))
        for(var i = 0; (i < Object.keys(storedCalendar).length); i++) {
            
            const mmddyyyy = Object.keys(storedCalendar)[i];
            
            if(mmddyyyy == "00/00") {
                
                const mm = mmddyyyy.split('/')[0];
                const dd = mmddyyyy.split('/')[1];
                // const yyyy = mmddyyyy.split('/')[2];
                
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
                                    console.log('countryEntityId', countryEntityId, 'entityLocationId', entityLocationId);
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
                    
                    for(var k = 0; k < entities.length; k++) {
                    
                        entity = entities[k];
                        
                        // console.log('entity', entity.length);
                    
                        
                        if(entity.length === 36) {
                            
                            if(view == VIEW_TAG) {
                                locations = Object.keys(storedCalendar[mmddyyyy][entity]);  
                            }
                            
                            // console.log('locations', locations);
                            
                            for(var j = 0; j < locations.length; j++) {
                        
                                const events = storedCalendar[mmddyyyy][entity][locations[j]];
                                if(events == null){
                                    continue;
                                }
                                // console.log('events', events.length, role, ROLE_REPORTER);
                                for(k = 0; k < events.length; k++) {
                                    
                                    var pushFlag = false;
                                    
                                    if(role == ROLE_REPORTER) {
                                        
                                        if(events[k]['reportersmap'][userprofileid] != null) {
                                            pushFlag = true;
                                        }
                                        
                                    }
                                    
                                    if(role == ROLE_APPROVER) {
                                        
                                        if(events[k]['approversmap'][userprofileid] != null) {
                                            pushFlag = true;
                                        }
                                        
                                    }
                                    
                                    if(role == ROLE_FUNCTION_HEAD) {
                                        
                                        if(events[k]['functionheadsmap'][userprofileid] != null) {
                                            pushFlag = true;
                                        }
                                        
                                    }
                                    
                                    if(role == ROLE_AUDITOR) {
                                        
                                        if(events[k]['auditorsmap'][userprofileid] != null) {
                                            pushFlag = true;
                                        }
                                        
                                    }
                                    
                                    if(role == ROLE_VIEWER) {
                                        
                                        if(events[k]['viewersmap'][userprofileid] != null) {
                                            pushFlag = true;
                                        }
                                        
                                    }
                                    
                                    if(pushFlag && view == VIEW_TAG) {
                                    
                                        if(tagid != "allevents") {
                                            if(events[k]['tagsmap'][tagid] == null) {
                                                pushFlag = false;
                                            }
                                        }
                                        
                                    }
                                    
                                    
                                    if(pushFlag) {
                                        
                                        if(searchstring != null && searchstring.length > 0) {
                                            
                                            if(events[k].obligationtitle.toLowerCase().indexOf(searchstring) >= 0
                                                || events[k].obligation.toLowerCase().indexOf(searchstring) >= 0
                                                || events[k].internalcontrols.toLowerCase().indexOf(searchstring) >= 0
                                                || events[k].obligation.toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].statute + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].category + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].subcategory + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].reference + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].authority + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].frequency + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].subfrequency + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].obligationtype + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].form + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].firstlineofdefence + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].secondlineofdefence + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].thirdlineofdefence + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].risk + "").toLowerCase().indexOf(searchstring) >= 0
                                                || (events[k].riskarea + "").toLowerCase().indexOf(searchstring) >= 0
                                                ) {
                                                    console.log('searchstring', searchstring, events[k].obligationtitle);
                                            } else {
                                                pushFlag = false;
                                            }
                                        
                                            
                                        }
                                        
                                        if(pushFlag) {
                                            
                                            if(arrEvents[mm + "/" + dd] == null) {
                                                arrEvents[mm + "/" + dd] = [];
                                            }
                                            
                                            arrEvents[mm + "/" + dd].push(events[k]);
                                            
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
    
    const response = {statusCode: 200, body: {result: true, data: {events: arrEvents}}};
    return response;
    
    
}