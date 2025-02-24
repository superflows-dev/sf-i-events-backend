// synccalendar (projectid, events)


import { KMS_KEY_REGISTER, BUCKET_NAME, BUCKET_FOLDER_REPORTING, GetObjectCommand, PutObjectCommand, s3Client } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processEncryptData } from './encryptdata.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processNotifyChange } from './notifychange.mjs';
import { processAddLog } from './addlog.mjs';
import { processCheckLastModifiedFile } from './checklastmodifiedfile.mjs'
import { processSendEmail } from './sendemail.mjs'
import { Buffer } from 'buffer';

export const processUploadReview = async (event) => {
    
    console.log('processing upload', event.body);
    
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
    
    // if(ADMIN_METHODS.includes("detail")) {
    //     if(!authResult.admin) {
    //         return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    //     }   
    // }
    
    // const userId = authResult.userId;
    
    const userId = "1234";
    
    var projectid = null;
    var eventid = null;
    var type = null;
    var comments = null;
    var approved = null;
    var mmddyyyy = null;
    var entityid = null;
    var locationid = null;
    var username = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        console.log(projectid);
        entityid = JSON.parse(event.body).entityid.trim();
        console.log(entityid);
        locationid = JSON.parse(event.body).locationid.trim();
        console.log(locationid);
        eventid = JSON.parse(event.body).eventid.trim();
        console.log(eventid);
        type = JSON.parse(event.body).type.trim();
        console.log(type);
        comments = JSON.parse(event.body).comments;
        console.log(type);
        approved = JSON.parse(event.body).approved;
        console.log(approved);
        mmddyyyy = JSON.parse(event.body).mmddyyyy;
        console.log(mmddyyyy);
        username = JSON.parse(event.body).username;
    } catch (e) {
        console.log('e',e)
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}};
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(entityid == null || entityid == "" || entityid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Entity Id is not valid!"}};
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(locationid == null || locationid == "" || locationid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Location Id is not valid!"}};
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(eventid == null || eventid == "" || eventid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Event Id is not valid!"}};
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(mmddyyyy == null || mmddyyyy == "" || mmddyyyy.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "mmddyyyy is not valid!"}};
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(type == null || type == "" || type.length < 1) {
        const response = {statusCode: 400, body: {result: false, error: "Type is not valid!"}};
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(comments == null) {
        const response = {statusCode: 400, body: {result: false, error: "Comments are not valid!"}};
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    // if(docs == null && docs.length === 0) {
    //     const response = {statusCode: 400, body: {result: false, error: "Docs are not valid!"}};
    //   // processAddLog(userId, 'detail', event, response, response.statusCode)
    //     return response;
    // }
    
    // if(dateofcompletion == null || dateofcompletion == "" || dateofcompletion.length < 1) {
    //     const response = {statusCode: 400, body: {result: false, error: "DateOfCompletion is not valid!"}};
    //   // processAddLog(userId, 'detail', event, response, response.statusCode)
    //     return response;
    // }
    
    let mm = mmddyyyy.split('/')[0]
    
    let assReports = {};
    let flag = false
    let index = 0
    let responseS3;
    let lastupdatedReports;
    var dbComments = [];
    let data;
    var strDataEncrypt = "";
    let _event = {}
    while(!flag && index < 5){
        var command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
        });
        
        try {
            responseS3 = await s3Client.send(command);
            const s3ResponseStream = responseS3.Body;
            lastupdatedReports = responseS3.LastModified
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
        
        data = {}
        dbComments = [];
        if(assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] != null) {
            
            var decryptData;
            
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
            
            data = JSON.parse(decryptData);
            
            dbComments = JSON.parse(decryptData).comments;
            _event = JSON.parse(decryptData).event;
            
        }
        
        var commentsText = comments + ' (Approved: '+(approved?'Yes':'No')+')';
        var flagNoReport = false
        var errorVal = 400
        if(dbComments.length === 0){
            flagNoReport = true;
            errorVal = 401
        }else if(dbComments.length > 0 && dbComments[dbComments.length - 1].author !== "Reporter"){
            console.log('top comment', dbComments)
            flagNoReport = true;
            errorVal = 402
        }
        if(flagNoReport){
            const response = {statusCode: errorVal, body: {result: false, message: "Review not uploaded"}};
            // processAddLog(userId, 'upload', event, response, response.statusCode)
            return response;
        }
    
        dbComments.push({"author":"Approver", "username": username, "comment": commentsText, "timestamp": (new Date()).toUTCString() + ""})
        
        data.comments = dbComments;
        data.lastupdated = (new Date()).toUTCString();
        data.approved = approved;
        data.projectid = projectid;
        
        var strData = JSON.stringify(data);
        
        strDataEncrypt = "";
        
        if(KMS_KEY_REGISTER[projectid] != null) {
            
            strDataEncrypt = await processEncryptData(projectid, strData);
            
        } else {
            strDataEncrypt = strData;
        }
        
        assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] = strDataEncrypt;
        index++;
        flag = await processCheckLastModifiedFile(BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",lastupdatedReports)
    }
    if(!flag){
        let bodyHtml = "File checking failed for reporting file: " + BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json" + "<br /><br />LastModified:" + lastupdatedReports.toString() + "<br /><br />Input: " + event.body
        let subject = "File lastmodified check failure - " + projectid
        await processSendEmail('ninad.t@flagggrc.tech, hrushi@flagggrc.tech',subject,'',bodyHtml)
        const response = {statusCode: 400, body: {result: false, error: "File handle not aquired!"}};
        return response;
    }
    
    let putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
        Body: JSON.stringify(assReports),
        ContentType: 'application/json'
    })
    
    try {
        await s3Client.send(putCommand);
    } catch (err) {
      console.log('putCommand err', err); 
    }
    let assReportsMonthly = {};
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
    });
    
    try {
        responseS3 = await s3Client.send(command);
        const s3ResponseStream = responseS3.Body;
        const chunks = [];
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk);
        }
        const responseBuffer = Buffer.concat(chunks);
        const jsonContent = JSON.parse(responseBuffer.toString());
        assReportsMonthly = jsonContent;
        
    } catch (err) {
      console.error(err); 
    }
    
    assReportsMonthly[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] = strDataEncrypt;
    
    putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
        Body: JSON.stringify(assReportsMonthly),
        ContentType: 'application/json'
    })
    
    try {
        await s3Client.send(putCommand);
    } catch (err) {
      console.log('putCommand err', err); 
    }
    const notifyChange = await processNotifyChange(event["headers"]["Authorization"], data, '/actionalert');
    console.log('notifyChange', notifyChange);
    // const response = {statusCode: 200, body: {result: true, notifyChange: notifyChange}};
    const response = {statusCode: 200, body: {result: true, notifyChange: data, event: _event}};
    processAddLog(userId, 'upload', event, response, response.statusCode)
    return response;

}