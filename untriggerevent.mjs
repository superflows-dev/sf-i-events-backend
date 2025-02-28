// mapevent (events[], users[])


import { BUCKET_NAME, s3Client, PutObjectCommand, GetObjectCommand, schedulerClient, CreateScheduleCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { processEncryptData } from './encryptdata.mjs'
import { Buffer } from "buffer";
export const processUnTriggerEvent = async (event) => {
    
    console.log('untriggerevent');
    
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
    var triggerid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        triggerid = JSON.parse(event.body).triggerid.trim();
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "ProjectId is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(triggerid == null) {
        const response = {statusCode: 400, body: {result: false, error: "Trigger is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_triggers_job_enc.json',
    });
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
    }  
    
    console.log('storedMapping size', storedMapping.length);
    
    for(var k = 0; k < storedMapping.length; k++) { 
        
        const strTriggers = (storedMapping[k].triggers);
        if(strTriggers.indexOf(triggerid) >= 0) {
            
            const arrTriggers = JSON.parse(storedMapping[k].triggers);
            const newTriggers = [];
            console.log('arrTriggers', arrTriggers);
            for(var l = 0; l < arrTriggers.length; l++) {
                if(arrTriggers[l].triggerId != triggerid) {
                    newTriggers.push(arrTriggers[l]);
                }
            }
            storedMapping[k].triggers = JSON.stringify(newTriggers);
            
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
            triggers: triggerid,
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
    
    const response = {statusCode: 200, body: {result: true}};
    processAddLog(userId, 'triggerevent', event, response, response.statusCode)
    return response;

}