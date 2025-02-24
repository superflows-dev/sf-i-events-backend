import { processAuthenticate } from './authenticate.mjs';
import { processAddLog } from './addlog.mjs';
import { processUploadReview } from './uploadreview.mjs';
import { schedulerClient, CreateScheduleCommand, s3Client, PutObjectCommand, GetObjectCommand, BUCKET_NAME, BUCKET_FOLDER_REPORTING, REPORTING_RETRY_LIMIT } from './globals.mjs';
import { processNotifyChange } from './notifychange.mjs';
import { processCheckRequestid } from './checkrequestid.mjs'
import { newUuidV4 } from './newuuid.mjs'
import { processEncryptData } from './encryptdata.mjs'
import { processDecryptData } from './decryptdata.mjs'
import { processSendEmail } from './sendemail.mjs'
import { Buffer } from 'buffer';
export const processUploadReviewsBulk = async (event) => {
    
    console.log('processing review', event.body);
    
    let flagRequest = await processCheckRequestid(event.requestid)
    if(!flagRequest){
        console.log('returning uploadBulk');
        return;
    }
    
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
    // let bodyHtml = "InputBody: " + event.body + "<br /><br />"
    // let subject = "Bulk Upload Review params - " + event.requestid
    // await processSendEmail("ninad.t@flagggrc.tech, hrushi@flagggrc.tech", subject,"", bodyHtml);
    let bodyArr = JSON.parse(event.body)
    let flagReported = false;
    let projectid = null;
    let retryattempts = "0"
    for( let [i,bodyObj] of bodyArr.entries()){
        projectid = bodyObj.projectid
        retryattempts = bodyObj.retryattempts ?? '0'
        if(bodyObj.processed != null && bodyObj.processed == true){
            continue;
        }
        // bodyHtml = "considering index: " + i + "<br /><br />"
        // subject = "Bulk Upload Review considering index - " + event.requestid
        // await processSendEmail("ninad.t@flagggrc.tech, hrushi@flagggrc.tech", subject,"", bodyHtml);
        if(i == 0){
            // let bodyHtml = "populating queue<br /><br />"
            // let subject = "Bulk Upload Review populate queue - " + event.requestid
            // await processSendEmail("ninad.t@flagggrc.tech, hrushi@flagggrc.tech", subject,"", bodyHtml);
            let getCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: BUCKET_FOLDER_REPORTING + '/bulk_' + projectid + "_reports_enc.json",
            })
            let responseS3;
            let jsonBulkReportsData = {}
            try{
                responseS3 = await s3Client.send(getCommand);
                const s3ResponseStream = responseS3.Body;
                const chunks = [];
                for await (const chunk of s3ResponseStream) {
                    chunks.push(chunk);
                }
                const responseBuffer = Buffer.concat(chunks);
                jsonBulkReportsData = JSON.parse(responseBuffer.toString());
            }catch(e){
                console.log('error in getCommand', e)
                jsonBulkReportsData = {}
            }
            for(let tempObj of bodyArr){
                let sortid = tempObj.mmddyyyy + ';' + tempObj.entityid + ';' + tempObj.locationid + ';' + tempObj.eventid
                jsonBulkReportsData[sortid] = tempObj
            }
            let encryptedData = await processEncryptData(projectid, JSON.stringify(jsonBulkReportsData))
            let putCommand = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: BUCKET_FOLDER_REPORTING + '/bulk_' + projectid + "_reports_enc.json",
                Body: encryptedData,
                ContentType: 'application/json'
            })
            
            try {
                await s3Client.send(putCommand);
            } catch (err) {
              console.log('putCommand err', err); 
            }
        }
        let tempEvent = {};
        tempEvent['headers'] = event['headers'];
        tempEvent.body = JSON.stringify(bodyObj);
        let resultUploadReview = await processUploadReview(tempEvent);
        console.log('upload review response', resultUploadReview)
        // let bodyHtml = "uploadReview response: " + JSON.stringify(resultUploadReview) + "<br /><br />Body: " + JSON.stringify(tempEvent) + "<br /><br />"
        // let subject = "Bulk Upload Review resultUploadReview - " + event.requestid
        // await processSendEmail("ninad.t@flagggrc.tech, hrushi@flagggrc.tech", subject,"", bodyHtml);
        if(resultUploadReview.statusCode == 200){
            let _event = resultUploadReview.body.event
            bodyObj.processed = true;
            bodyObj.success = true;
            bodyObj.action = "reviewed";
            bodyObj.shortid = JSON.parse(_event)['shortid']
            bodyObj.entityname = JSON.parse(_event)['entityname']
            bodyObj.locationname = JSON.parse(_event)['locationname']
            bodyObj.statute = JSON.parse(_event)['statute']
            bodyObj.obligationtitle = JSON.parse(_event)['obligationtitle']
            bodyObj.reporters = JSON.parse(_event)['reporters']
            bodyObj.approvers = JSON.parse(_event)['approvers']
            bodyArr[i] = bodyObj;
            
        }else{
            retryattempts  = (parseInt(retryattempts) + 1) + ""
            bodyArr[i].retryattempts = retryattempts
            if(parseInt(retryattempts) >= REPORTING_RETRY_LIMIT){
                bodyArr[i].processed = true;
                bodyArr[i].statuscode = resultUploadReview.statusCode;
                let bodyHtml = "InputBody: " + JSON.stringify(bodyArr) + "<br /><br />"
                let subject = "Bulk Review failed - " + event.requestid
                await processSendEmail("ninad.t@flagggrc.tech, hrushi@flagggrc.tech", subject,"", bodyHtml);
            }
        }
        flagReported = true;
        break;
        
    }
    let notifyChange;
    if(flagReported){
    
        let currentTime = new Date().getTime()
        let scheduleDate = new Date(currentTime + 2*1000);
        let inputObj = {
            path:event['path'] ?? event['rawPath'],
            requestid: newUuidV4(),
            body:JSON.stringify(bodyArr),
            headers: event["headers"]
        }
        let inputStr = JSON.stringify(inputObj)
        // console.log('inputObj', inputObj);
        const input = { // CreateScheduleInput
        Name: "RULE_Review_" + projectid + "_" + (new Date().getTime()), // required
        ScheduleExpression: "at(" + scheduleDate.toISOString().split('.')[0] + ")", // required
        Target: { // Target
          Arn: "arn:aws:lambda:us-east-1:181895849565:function:F_sf-i-events_FlaggGRC-Events_1683434598476_test", // required
          RoleArn: "arn:aws:iam::181895849565:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_88907155fe", // required
          RetryPolicy: { // RetryPolicy
            MaximumEventAgeInSeconds: Number(24*60*60),
            MaximumRetryAttempts: Number(185),
          },
          Input: inputStr,
        },
        FlexibleTimeWindow: { // FlexibleTimeWindow
          Mode: "OFF", // required
        },
        ActionAfterCompletion: "DELETE"
        };
        
        const scheduleCommand = new CreateScheduleCommand(input);
        let responseSchedule = await schedulerClient.send(scheduleCommand);
        console.log('Job Scheduled', responseSchedule.ScheduleArn)
        // bodyHtml = "Scheduler result: " + JSON.stringify(responseSchedule) + "<br /><br />Params: " + inputStr +"<br />"
        // subject = "Bulk Upload Review scheduler - " + event.requestid
        // await processSendEmail("ninad.t@flagggrc.tech, hrushi@flagggrc.tech", subject,"", bodyHtml);
    }else{
        //dashboard send email call
        let getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: BUCKET_FOLDER_REPORTING + '/bulk_' + projectid + "_reports_enc.json",
        })
        let responseS3;
        let jsonBulkReportsData = {}
        try{
            responseS3 = await s3Client.send(getCommand);
            const s3ResponseStream = responseS3.Body;
            const chunks = [];
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk);
            }
            const responseBuffer = Buffer.concat(chunks);
            let decryptedData = await processDecryptData(projectid,responseBuffer.toString() )
            jsonBulkReportsData = JSON.parse(decryptedData);
        }catch(e){
            console.log('error in getCommand', e)
            jsonBulkReportsData = {}
        }
        for(let tempObj of bodyArr){
            let sortid = tempObj.mmddyyyy + ';' + tempObj.entityid + ';' + tempObj.locationid + ';' + tempObj.eventid
            delete jsonBulkReportsData[sortid]
        }
        let encryptedData = await processEncryptData(projectid, JSON.stringify(jsonBulkReportsData))
        let putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: BUCKET_FOLDER_REPORTING + '/bulk_' + projectid + "_reports_enc.json",
            Body: encryptedData,
            ContentType: 'application/json'
        })
        
        try {
            await s3Client.send(putCommand);
        } catch (err) {
          console.log('putCommand err', err); 
        }
        notifyChange = await processNotifyChange(event["headers"]["Authorization"], bodyArr, '/bulkreportalert');
    }
    
    const response = {statusCode: 200, body: {result: true, notifychange: notifyChange}};
    processAddLog('1234', 'uploadReviewBulk', event, response, response.statusCode)
    return response;

}