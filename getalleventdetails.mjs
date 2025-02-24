// getuserevents (projectid, userprofileid)


import { getSignedUrl, KMS_KEY_REGISTER, SERVER_KEY, ROLE_REPORTER, ROLE_APPROVER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR, FINCAL_START_MONTH, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, ADMIN_METHODS, BUCKET_NAME, s3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, VIEW_COUNTRY, VIEW_ENTITY, VIEW_LOCATION, VIEW_TAG, BUCKET_FOLDER_REPORTING } from "./globals.mjs";
import { processIsInCurrentFincal } from './isincurrentfincal.mjs';
import { processIsMyEvent } from './ismyevent.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processDdbQuery } from './ddbquery.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import crypto from 'crypto';

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const processGetAllEventDetails = async (event) => {
    
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
    
    var projectid = null;
    var eventid = null;
    var entityid = null;
    var locationid = null;
    var userprofileid = null;
    var role = null;
    // var countryid = null;
    var mmddyyyy = null;
    var year = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        eventid = JSON.parse(event.body).eventid.trim();
        entityid = JSON.parse(event.body).entityid.trim();
        locationid = JSON.parse(event.body).locationid.trim();
        userprofileid = JSON.parse(event.body).userprofileid;
        role = JSON.parse(event.body).role.trim();
        mmddyyyy = JSON.parse(event.body).mmddyyyy.trim();
        year = JSON.parse(event.body).year.trim();
    } catch (e) {
        console.log(e)
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Project Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(eventid == null || eventid == "" || eventid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
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
        const response = {statusCode: 400, body: {result: false, error: "Role is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(year == null || year == "" || year.length < 2) {
        const response = {statusCode: 400, body: {result: false, error: "Year is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    console.log('inside processGetAllCountryEvents 2', new Date().getTime());
    
    // var getParams = {
    //     TableName: TABLE,
    //     Key: {
    //       projectid: { S: projectid },
    //     },
    // };
    
    // console.log('inside processGetAllCountryEvents 3');
    // const calendarList = [];
    let mm = mmddyyyy.split('/')[0]
    
    
    let userFileKey = projectid + '_' + userprofileid + '_' + year + '_' + role +'_calendar_' + mm + '_job_enc.json'
    // let flagUserFileNotFound = false;
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: userFileKey,
    });
    
    let responseS3;
    var storedCalendar = {};
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
        storedCalendar = jsonContent;
        
        
    } catch (err) {
      console.log(err);
      const response = {statusCode: 404, body: {result: false, error: "Calendar not found!"}}
   // processAddLog(userId, 'detail', event, response, response.statusCode)
      return response;
    }
    console.log('inside processGetAllCountryEvents 3', new Date().getTime());
    
    let assReports = {};
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
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
    console.log('reports found 1', Object.keys(assReports), assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] == null)
    if(assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] == null){
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
    
    var decryptData;
    if(assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] != null) {
        
        
        
        if(assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid].indexOf("::") >= 0) {
            
            decryptData = await processDecryptData(projectid, assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid]);
            
        } else {
            
            if(KMS_KEY_REGISTER[projectid] != null) {
                const text = await processKmsDecrypt(projectid, assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid]);
                decryptData = text.toLowerCase().indexOf('error') >= 0 ? assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] : text;
            } else {
                decryptData = assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid]
            }
            
        }
        
        
        // dbComments = JSON.parse(decryptData).comments;
    }
    // console.log('storedCalendar events',Object.keys(storedCalendar), mmddyyyy)
    console.log('inside processGetAllCountryEvents 4', new Date().getTime());
    const events = storedCalendar[mmddyyyy][entityid][locationid];
    // console.log('events', assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid], mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid) ;
    if(events == null){
        const response = {statusCode: 404, body: {result: false, error: "Event not found!"}}
   // processAddLog(userId, 'detail', event, response, response.statusCode)
      return response;
    }
    let returnEvent = {}
    for(var l = 0; l < events.length; l++) {
        if(events[l].id == eventid){
            try{                                            
                const jsonData = JSON.parse(decryptData);
                
                // console.log('jsonData',jsonData, mmddyyyy)    
                events[l].documents = JSON.parse(jsonData.docs ?? "[]");
                events[l].comments = jsonData.comments;
                events[l].approved = jsonData.approved;
                events[l].lastupdated = jsonData.lastupdated;
                events[l].dateofcompletion = jsonData.dateofcompletion;
                // console.log('jsonData.comments', Object.keys(jsonData), events[l].comments);
                if(jsonData.event != null) {
                    events[l].reportevent = jsonData.event;
                }
            }catch(e){
                console.log('reporting err', e, decryptData);
                events[l].documents = [];
                events[l].comments = [];
                events[l].approved = false;
                events[l].lastupdated = "";
                events[l].dateofcompletion = "";
            }
            if(events[l]['reportformat'] != null && events[l]['reportformat'].length > 0){
                events[l]['docs'] = ['Not Required']
            }
            returnEvent = events[l]
            break;
        }
    }
    console.log('inside processGetAllCountryEvents 5', new Date().getTime());
    const response = {statusCode: 200, body: {result: true, data: returnEvent}};
    // const response = {statusCode: 200, body: {result: true, events: arrEvents}};
    return response;
    
}
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}