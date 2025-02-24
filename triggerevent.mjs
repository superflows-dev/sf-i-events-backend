// mapevent (events[], users[])


import { ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, UpdateItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, TIMEFRAME_BEFORE, TIMEFRAME_AFTER, BUCKET_NAME, s3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, schedulerClient, CreateScheduleCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processGetCalendar } from './getcalendar.mjs';
import { processNotifyChange } from './notifychange.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { processEncryptData } from './encryptdata.mjs'
export const processTriggerEvent = async (event) => {
    
    console.log('triggerevent');
    
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
    
    console.log(email, accessToken);
    
    const authResult = await processAuthenticate(event["headers"]["Authorization"]);
    
    if(!authResult.result) {
        return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    }
    
    const userId = authResult.userId;
    
    // const userId = "1234";
    
    var projectid = null;
    var triggers = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        triggers = JSON.parse(event.body).triggers;
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
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_triggers_job_enc.json',
    });
    let flagEncryptedNotFound = false
    var responseS3;
    var storedMapping = null;
    
    try {
        
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString()) 
        storedMapping = JSON.parse(decryptedData).mappings;
        
    } catch (err) {
      console.error(err); 
      flagEncryptedNotFound = true
    } 
    if(flagEncryptedNotFound){
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_triggers_job.json',
        });
        
        responseS3;
        storedMapping = null;
        
        try {
            
            const response = await s3Client.send(command);
            const s3ResponseStream = response.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks) 
            storedMapping = JSON.parse(responseBuffer.toString()).mappings;
            
        } catch (err) {
          console.error(err); 
        }   
    }
    var storedMappingTags = null;
    for(var i = 0; i < triggers.length; i++) {
        
        const trigger = triggers[i];
        const triggerId = newUuidV4().replace(/-/g, '_');
        trigger.triggerId = triggerId;
        
        for(var j = 0; j < trigger.compliances.length; j++) {
                
            const complianceId = (trigger.compliances[j].id + "");
            const remarks = trigger.remarks;
            
            const triggerDate = trigger.dateOfTrigger;
            const triggerTs = new Date(triggerDate.split('/')[2], triggerDate.split('/')[1], triggerDate.split('/')[0]);
            
            const occurrenceDate = trigger.dateOfOccurrence;
            const occurrenceTs = new Date(occurrenceDate);
            
            const yyyy = occurrenceDate.split('-')[0];
            const mm = occurrenceDate.split('-')[1];
            const dd = occurrenceDate.split('-')[2];
            
            const responseDays = parseInt(trigger.compliances[j].responsedays);
            var instances = trigger.compliances[j].adhocinstances;
            var nextBlock = trigger.compliances[j].subfrequency[0].toLowerCase().indexOf('year') >= 0 ? 365 : trigger.compliances[j].subfrequency[0].toLowerCase().indexOf('month') >= 0 ? 30 : trigger.compliances[j].subfrequency[0].toLowerCase().indexOf('half') >= 0 ? 180 : 90;
            
            var tempTs = occurrenceTs;
            if(trigger.compliances[j].timeframe[0].toLowerCase() == "after") {
                tempTs.setDate(tempTs.getDate() + responseDays);
            } else {
                tempTs.setDate(tempTs.getDate() - responseDays);
            }
            
            var targetDates = [];
            
            var triggerPostfix = ("0" + tempTs.getDate()).slice(-2) + '/' + ("0" + (tempTs.getMonth()+1)).slice(-2) + "/" + ("0" + tempTs.getFullYear()).slice(-4) + "";
            targetDates.push(triggerPostfix);
            for(var instance = 1; instance < instances; instance++) {
                tempTs.setDate(tempTs.getDate() + nextBlock);
                targetDates.push((("0" + tempTs.getDate()).slice(-2) + '/' + ("0" + (tempTs.getMonth()+1)).slice(-2) + "/" + ("0" + tempTs.getFullYear()).slice(-4) + ""))
            }
            triggerPostfix = triggerPostfix.replace(/,\s*$/, "");
            
            var triggerObj = {
                triggerDate: triggerDate,
                occurrenceDate: dd + '/' + mm + '/' + yyyy,
                targetDates: targetDates,
                triggerId: triggerId,
                complianceId: complianceId,
                remarks: remarks
            };
            
            // console.log('triggerObj', triggerObj);
            var count = 0;
            
            for(var k = 0; k < storedMapping.length; k++) { 
                
                if(trigger.locationId != "") {
                    
                    if((storedMapping[k].id == complianceId && storedMapping[k].locationid == trigger.locationId)) {
                        
                        if(storedMapping[k].triggers != null && storedMapping[k].triggers != "") {
                            
                            if(storedMapping[k].triggers.indexOf(triggerId) >= 0) {
                            } else {
                                var newArr = JSON.parse(storedMapping[k].triggers);
                                newArr.push(triggerObj);
                                storedMapping[k].triggers = JSON.stringify(newArr);
                            }
                            
                        } else {
                            var newArr = [];
                            newArr.push(triggerObj)
                            storedMapping[k].triggers = JSON.stringify(newArr);
                        }
                        
                        // storedMapping[k].triggers = "";
                        // console.log('arr', storedMapping[k].triggers, count, storedMapping[k].locationname);
                    }
            
                } else if(trigger.entityId != "") {
                    
                    if(storedMapping[k].id == complianceId && storedMapping[k].entityid == trigger.entityId) {
                        
                        if(storedMapping[k].triggers != null && storedMapping[k].triggers != "") {
                            
                            if(storedMapping[k].triggers.indexOf(triggerId) >= 0) {
                            } else {
                                var newArr = JSON.parse(storedMapping[k].triggers);
                                newArr.push(triggerObj);
                                storedMapping[k].triggers = JSON.stringify(newArr);
                            }
                            
                        } else {
                            var newArr = [];
                            newArr.push(triggerObj)
                            storedMapping[k].triggers = JSON.stringify(newArr);
                        }
                        
                        // storedMapping[k].triggers = "";
                        // console.log('arr', storedMapping[k].triggers, count, storedMapping[k].locationname);
                        
                    }
                    
                } else if(trigger.countryId != "") {
                    
                    if(storedMapping[k].id == complianceId && storedMapping[k].countryid == trigger.countryId) {
                        
                        if(storedMapping[k].triggers != null && storedMapping[k].triggers != "") {
                            
                            if(storedMapping[k].triggers.indexOf(triggerId) >= 0) {
                            } else {
                                var newArr = JSON.parse(storedMapping[k].triggers);
                                newArr.push(triggerObj);
                                storedMapping[k].triggers = JSON.stringify(newArr);
                            }
                            
                        } else {
                            var newArr = [];
                            newArr.push(triggerObj)
                            storedMapping[k].triggers = JSON.stringify(newArr);
                        }
                        
                        // storedMapping[k].triggers = "";
                        // console.log('arr', storedMapping[k].triggers, count, storedMapping[k].locationname);
                        
                        
                    }
                    
                } else if(trigger.tagId != ""){
                    if(storedMappingTags == null){
                        command = new GetObjectCommand({
                          Bucket: BUCKET_NAME,
                          Key: projectid + '_tags_job_enc.json',
                        });
                        let flagEncryptedNotFound = false
                        
                        try {
                            
                            const response = await s3Client.send(command);
                            const s3ResponseStream = response.Body;
                            const chunks = []
                            for await (const chunk of s3ResponseStream) {
                                chunks.push(chunk)
                            }
                            const responseBuffer = Buffer.concat(chunks)
                            let decryptedData = await processDecryptData(projectid, responseBuffer.toString()) 
                            storedMappingTags = JSON.parse(decryptedData).mappings;
                            
                        } catch (err) {
                          console.error(err); 
                          flagEncryptedNotFound = true
                        } 
                        if(flagEncryptedNotFound){
                            command = new GetObjectCommand({
                              Bucket: BUCKET_NAME,
                              Key: projectid + '_tags_job.json',
                            });
                            
                            responseS3;
                            storedMappingTags = null;
                            
                            try {
                                
                                const response = await s3Client.send(command);
                                const s3ResponseStream = response.Body;
                                const chunks = []
                                for await (const chunk of s3ResponseStream) {
                                    chunks.push(chunk)
                                }
                                const responseBuffer = Buffer.concat(chunks) 
                                storedMappingTags = JSON.parse(responseBuffer.toString()).mappings;
                                
                            } catch (err) {
                              console.error(err); 
                            }   
                        }
                    }
                    
                    if(storedMappingTags != null && storedMappingTags[k] != null && storedMappingTags[k].id == complianceId && storedMapping[k].id == complianceId) {
                        
                        let flagFound = false;
                        for (let tag of storedMappingTags[k].tags){
                            let tagId = tag.split(';')[1] ?? ""
                            if(tagId == trigger.tagId){
                                // console.log('storedMappingTags[k]', storedMappingTags[k].id, tagId, trigger.tagId)
                                flagFound = true;
                                break;
                            }
                        }
                        if(flagFound){
                            if(storedMapping[k].triggers != null && storedMapping[k].triggers != "") {
                                
                                if(storedMapping[k].triggers.indexOf(triggerId) >= 0) {
                                } else {
                                    var newArr = JSON.parse(storedMapping[k].triggers);
                                    newArr.push(triggerObj);
                                    storedMapping[k].triggers = JSON.stringify(newArr);
                                }
                                
                            } else {
                                var newArr = [];
                                newArr.push(triggerObj)
                                storedMapping[k].triggers = JSON.stringify(newArr);
                            }
                            console.log("triggers", storedMapping[k].triggers.length);
                        }
                        
                        // storedMapping[k].triggers = "";
                        // console.log('arr', storedMapping[k].triggers, count, storedMapping[k].locationname);
                        
                        
                    }
                }
                
                count++;
                
            }
            
        }
        
    }
    
    const jsonData = {};
    
    jsonData.mappings = storedMapping;
    let encryptedData = await processEncryptData(projectid, JSON.stringify(jsonData))
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_triggers_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    responseS3;
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
      console.error(err);
    }
    
    let currentTime = new Date().getTime()
    let scheduleDate = new Date(currentTime + 1*60*1000);
    let inputObj = {
        path:"/getcalendartrigger",
        body:JSON.stringify({
            projectid: projectid,
            triggers: triggers,
            notifychange: "false"
        }),
        headers: event["headers"]
    }
    const input = { // CreateScheduleInput
    Name: "RULE_Trigger_" + projectid + "_" + (new Date().getTime()), // required
    ScheduleExpression: "at(" + scheduleDate.toISOString().split('.')[0] + ")", // required
    Target: { // Target
      Arn: "arn:aws:lambda:us-east-1:181895849565:function:F_sf-i-events_FlaggGRC-Events_1683434598476_test", // required
      RoleArn: "arn:aws:iam::181895849565:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_88907155fe", // required
      RetryPolicy: { // RetryPolicy
        MaximumEventAgeInSeconds: Number(24*60*60),
        MaximumRetryAttempts: Number(185),
      },
      Input: JSON.stringify(inputObj),
    },
    FlexibleTimeWindow: { // FlexibleTimeWindow
      Mode: "OFF", // required
    },
    ActionAfterCompletion: "DELETE"
    };
    
    const scheduleCommand = new CreateScheduleCommand(input);
    await schedulerClient.send(scheduleCommand);
    
    // const evCalendar = {};
    
    // evCalendar.body = JSON.stringify({
    //     projectid: projectid,
    //     year: new Date().getFullYear()
    // });
    
    // evCalendar.headers = event["headers"];
    
    // const resultCalendar = await processGetCalendar(evCalendar)
    // if(!resultCalendar.body.result) {
        
    //     const response = {statusCode: 409, body: {result: false, error: "Your request is registered. However, it is in pending state because of some technical issues! Please contact admin to complete it."}};
    //     processAddLog(userId, 'triggerevent', event, response, response.statusCode)
    //     return response;
        
    // } else {
        
        const adhocNotifyResult = await processNotifyChange(event["headers"]["Authorization"], {projectid: projectid, triggers: triggers}, '/adhocalert'); 
    
        const response = {statusCode: 200, body: {result: true, adhocNotifyResult: adhocNotifyResult}};
        processAddLog(userId, 'triggerevent', event, response, response.statusCode)
        return response;
    
    // }
    
    // const response = {statusCode: 200, body: {result: true}};
    // processAddLog(userId, 'triggerevent', event, response, response.statusCode)
    // return response;

}