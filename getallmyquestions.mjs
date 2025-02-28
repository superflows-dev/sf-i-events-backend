// getuserevents (projectid, userprofileid)


import { s3Client, GetObjectCommand, BUCKET_NAME } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { Buffer } from 'buffer'

export const processGetAllMyQuestions = async (event) => {
    
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
    var role = null;
    var year = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        userprofileid = JSON.parse(event.body).userprofileid.trim();
        role = JSON.parse(event.body).role.trim();
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
    
    let userFileKey = projectid + '_' + userprofileid + '_' + year + '_' + role +'_calendar_job_enc.json'
    let flagUserFileNotFound = false;
    
    let command = new GetObjectCommand({
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
      flagUserFileNotFound = true
    }
    var arrQuestions = {};
    if(!flagUserFileNotFound){
        for(var i = 0; (i < Object.keys(storedCalendar).length); i++) {
            
            const mmddyyyy = Object.keys(storedCalendar)[i];
            
            if(mmddyyyy == "00/00") {
                
                for(let entity of (Object.keys(storedCalendar[mmddyyyy]))){
                    if(entity == 'locations' || entity == 'countries' || entity == 'tags'){
                        continue;
                    }
                    for(let locationid of Object.keys(storedCalendar[mmddyyyy][entity])){
                        for(let event of storedCalendar[mmddyyyy][entity][locationid]){
                            if(event['question'] == ""){continue;}
                            if(arrQuestions[event['question']] == null){
                                arrQuestions[event['question']] = [event['locationname'].replace(/\([^)]*\)/g,"")]
                            }else{
                                if(arrQuestions[event['question']].indexOf(event['locationname'].replace(/\([^)]*\)/g,"")) < 0){
                                    arrQuestions[event['question']].push(event['locationname'].replace(/\([^)]*\)/g,""))
                                }
                            }
                        }
                    }
                }
            }
        }
    }else{
        const response = {statusCode: 404, body: {result: false, error: "User Calendar not found!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    
    const response = {statusCode: 200, body: {result: true, data: {questions: arrQuestions}}};
    return response;
    
    
}