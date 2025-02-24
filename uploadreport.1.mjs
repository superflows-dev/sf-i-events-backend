// synccalendar (projectid, events)


import { KMS_KEY_REGISTER, BUCKET_FOLDER_REPORTING, GetObjectCommand, PutObjectCommand, s3Client } from "./globals.mjs";
import { processEncryptData } from './encryptdata.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { processNotifyChange } from './notifychange.mjs';
import { processAddLog } from './addlog.mjs';
import { processSendEmail } from './sendemail.mjs'
import { processCheckLastModifiedFile } from './checklastmodifiedfile.mjs'
import { processGetModuleBucketname } from './getmodulebucketname.mjs'
import { processAddUserLastTime } from './adduserlasttime.mjs'
import { Buffer } from 'buffer';
export const processUploadReport1 = async (event) => {
    
    // console.log('processing upload', event.body);
    
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
    var eventid = null;
    var type = null;
    var comments = null;
    var docs = null;
    var mmddyyyy = null;
    var dateofcompletion = null;
    var entityid = null;
    var locationid = null;
    var _event = null;
    var username = null;
    var userid = null;
    var userrole = null;
    var year = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        entityid = JSON.parse(event.body).entityid.trim();
        locationid = JSON.parse(event.body).locationid.trim();
        eventid = JSON.parse(event.body).eventid.trim();
        type = JSON.parse(event.body).type.trim();
        comments = JSON.parse(event.body).comments;
        docs = JSON.parse(event.body).docs;
        mmddyyyy = JSON.parse(event.body).mmddyyyy;
        dateofcompletion = JSON.parse(event.body).dateofcompletion;
        _event = JSON.parse(event.body).event;
        username = JSON.parse(event.body).username;
        userid = JSON.parse(event.body).userid;
        userrole = JSON.parse(event.body).userrole;
        year = JSON.parse(event.body).year;
    } catch (e) {
        console.log('error', e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body! " + event.body}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    // console.log(Object.keys(_event))
    // console.log('makercheckers',_event['makercheckers'])
    
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
    
    if(docs == null) {
        const response = {statusCode: 400, body: {result: false, error: "Docs are not valid!"}};
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(dateofcompletion == null || dateofcompletion == "" || dateofcompletion.length < 1) {
        const response = {statusCode: 400, body: {result: false, error: "DateOfCompletion is not valid!"}};
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var reportformatvalues = null;
    var reportformatschema = null;
    try {
        reportformatvalues = JSON.parse(event.body).reportformatvalues;
        reportformatschema = JSON.parse(event.body).reportformatschema;
    }catch(e){
        console.log('reportformat error',e)
    }
    let module = "events";
    try {
        module = JSON.parse(event.body).module ?? "events";
    }catch(e){
        console.log('module error',e)
    }
    let bucketname = processGetModuleBucketname(module);
    let mm = mmddyyyy.split('/')[0]
    if(_event == null && userid != null && userrole != null && year != null && module != 'notices'){
        let userFileKey = projectid + '_' + userid + '_' + year + '_' + userrole +'_calendar_job_enc.json'
        
        var command = new GetObjectCommand({
          Bucket: bucketname,
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
          console.log('event read err', err);
        }
        for(let calEvent of storedCalendar[mmddyyyy][entityid][locationid]){
            // console.log('stored event', calEvent.id, eventid, userFileKey)
            if(calEvent.id == eventid){
                _event = JSON.stringify(calEvent)
                break;
            }
        }
        
    }
    
    // console.log('event', _event)
    let flag = false
    let index = 0
    let assReports = {};
    let responseS3;
    let lastupdatedReports = "";
    var dbComments = [];
    let data;
    var strDataEncrypt = "";
    while(!flag && index < 5){
        command = new GetObjectCommand({
          Bucket: bucketname,
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
        // console.log('last modified', lastupdatedReports)
        
        if(assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] != null) {
            
            var decryptData;
            
            if(assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid].indexOf("::") >= 0 && assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid].split('::').length > 2) {
                console.log('dec ', assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid].split('::').length)
                decryptData = await processDecryptData(projectid, assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid]);
                console.log('decrypting 1', projectid, assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid].length, decryptData.length);
            } else {
                
                if(KMS_KEY_REGISTER[projectid] != null) {
                    const text = await processKmsDecrypt(projectid, assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid]);
                    decryptData = text.toLowerCase().indexOf('error') >= 0 ? assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] : text;
                    console.log('decryptdata 2', text)
                } else {
                    decryptData = assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid]
                    console.log('decryptdata 3')
                }
                
            }
            let flagDoubleEncrypted = false
            try{
                dbComments = JSON.parse(decryptData).comments ?? [];
            }catch(e){
                console.log('JSON parse error',e)
                flagDoubleEncrypted = true;
            }
            if(flagDoubleEncrypted){
                try{
                    dbComments = JSON.parse(await processKmsDecrypt(projectid, decryptData)).comments ?? []
                }catch(e){
                    console.log('JSON parse double error',e);
                    dbComments = []
                }
            }
        }
        
        var commentsText = comments + ' (Documents Saved: '+(JSON.parse(docs).length)+')';
        
        dbComments.push({"author":"Reporter", "username": username, "comment": commentsText, "timestamp": (new Date()).toUTCString() + ""})
        
        data = {
            projectid: projectid,
            docs: docs,
            comments: dbComments,
            lastupdated: (new Date()).toUTCString(),
            dateofcompletion: dateofcompletion,
            event: _event,
            reportformatschema: reportformatschema ?? "",
            reportformatvalues: reportformatvalues ?? ""
        };
        
        var strData = JSON.stringify(data);
        
        strDataEncrypt = "";
        
        if(KMS_KEY_REGISTER[projectid] != null) {
            
            strDataEncrypt = await processEncryptData(projectid, strData);
            
        } else {
            strDataEncrypt = strData;
        }
        
        assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] = strDataEncrypt;
        index++;
        flag = await processCheckLastModifiedFile(BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",lastupdatedReports, bucketname)
        console.log('flag', flag)
    }
    if(!flag){
        let bodyHtml = "File checking failed for reporting file: " + BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json" + "<br /><br />LastModified:" + lastupdatedReports.toString() + "<br /><br />Input: " + event.body
        let subject = "File lastmodified check failure - " + projectid
        await processSendEmail('ninad.t@flagggrc.tech, hrushi@flagggrc.tech',subject,'',bodyHtml)
        const response = {statusCode: 400, body: {result: false, error: "File handle not aquired!"}};
        return response;
    }
    let putCommand = new PutObjectCommand({
        Bucket: bucketname,
        Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
        Body: JSON.stringify(assReports),
        ContentType: 'application/json'
    })
    try {
        await s3Client.send(putCommand);
    } catch (err) {
      console.log('putCommand yearly err', err); 
    }
    
    let assReportsMonthly = {};
    command = new GetObjectCommand({
      Bucket: bucketname,
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
        Bucket: bucketname,
        Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
        Body: JSON.stringify(assReportsMonthly),
        ContentType: 'application/json'
    })
    try {
        await s3Client.send(putCommand);
    } catch (err) {
      console.log('putCommand err', err); 
    }
    let notifyChange
    if(_event != null){
        let makercheckers = JSON.parse(_event)['makercheckers'] == null ? [] : JSON.parse(_event)['makercheckers']; 

        if(makercheckers.length == 0){
            notifyChange = await processNotifyChange(event["headers"]["Authorization"], data, '/actionalert');
        }else{
            console.log("not sending email for auto approved compliance")
        }
    }

    await processAddUserLastTime(projectid, userid, 'lastaction')
    // const notifyChange = null;
    
    // command = new GetObjectCommand({
    //   Bucket: BUCKET_NAME,
    //   Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
    // });
    
    // try {
    //     responseS3 = await s3Client.send(command);
    //     const s3ResponseStream = responseS3.Body;
    //     const chunks = [];
    //     for await (const chunk of s3ResponseStream) {
    //         chunks.push(chunk);
    //     }
    //     const responseBuffer = Buffer.concat(chunks);
    //     const jsonContent = JSON.parse(responseBuffer.toString());
    //     assReports = jsonContent;
        
    // } catch (err) {
    //   console.error(err); 
    // }
    
    // if(assReports[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] == null){
    //     let bodyHtml = "Upload failed for yearly file: " + BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json" + "<br /><br />Error:" + yearlyErr.toString() + "<br /><br />Input: " + event.body
    //     let subject = "Upload Report yearly file failure - " + projectid
    //     await processSendEmail('ninad.t@flagggrc.tech, hrushi@flagggrc.tech',subject,'',bodyHtml)
    // }
    
    // command = new GetObjectCommand({
    //   Bucket: BUCKET_NAME,
    //   Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
    // });
    
    // try {
    //     responseS3 = await s3Client.send(command);
    //     const s3ResponseStream = responseS3.Body;
    //     const chunks = [];
    //     for await (const chunk of s3ResponseStream) {
    //         chunks.push(chunk);
    //     }
    //     const responseBuffer = Buffer.concat(chunks);
    //     const jsonContent = JSON.parse(responseBuffer.toString());
    //     assReportsMonthly = jsonContent;
        
    // } catch (err) {
    //   console.error(err); 
    // }
    // if(assReportsMonthly[mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid] == null){
    //     let bodyHtml = "Upload failed for monthly file: " + BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json" + "<br /><br />Error:" + monthlyErr.toString() + "<br /><br />Input: " + event.body
        // let subject = "Upload Report monthly file failure - " + projectid
    //     await processSendEmail('ninad.t@flagggrc.tech, hrushi@flagggrc.tech',subject,'',bodyHtml)
    // }
    
    const response = {statusCode: 200, body: {result: true, notifyChange: notifyChange, event: _event}};
    // const response = {statusCode: 200, body: {result: true, lastModified: lastupdatedReports}};
    processAddLog('1234', 'upload', event, response, response.statusCode)
    return response;

}