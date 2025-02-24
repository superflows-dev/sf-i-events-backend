import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { ROLE_CLIENTADMIN, ROLE_CLIENTCOORD, ROLE_CLIENTSPOC, s3Client, GetObjectCommand, PutObjectCommand, BUCKET_NAME, BUCKET_FOLDER_REPORTING, KMS_KEY_REGISTER } from './globals.mjs'
import { processDecryptData } from './decryptdata.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processEncryptData } from './encryptdata.mjs';
export const processReconcileSingleReport = async (event) => {
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
    const authoResult = await processAuthorize(event["headers"]["Authorization"], email);
    if(!authResult.admin.BOOL) {
        const authoRole = authoResult.result[0]["role"] != null ? JSON.parse(authoResult.result[0]["role"].S) : "";
        if(!authResult.result) {
            return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
        }
        if(!authResult.admin.BOOL && authoRole != ROLE_CLIENTADMIN && authoRole != ROLE_CLIENTSPOC && authoRole != ROLE_CLIENTCOORD) {
            return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
        }    
    }
    var projectid = null;
    var eventid = null;
    var mmddyyyy = null;
    var entityid = null;
    var locationid = null;
    var yeartomonth = "yes"
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        entityid = JSON.parse(event.body).entityid.trim();
        locationid = JSON.parse(event.body).locationid.trim();
        eventid = JSON.parse(event.body).eventid.trim();
        mmddyyyy = JSON.parse(event.body).mmddyyyy.trim();
        yeartomonth = JSON.parse(event.body).yeartomonth.trim();
    } catch (e) {
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Project Id is not valid!"}};
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
    
    let assReports = {};
    let responseS3;
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
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
        assReports = jsonContent;
        
    } catch (err) {
      console.error(err.Code, BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json"); 
    }
    
    let assReportsMonthly = {}
    let mm = mmddyyyy.split('/')[0]
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
      console.error(err.Code, BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json"); 
    }
    let sortid = mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid
    console.log('sortid', sortid);
    console.log('yearly size', Object.keys(assReports).length);
    console.log('monthly size', Object.keys(assReportsMonthly).length);
    console.log('yearly before', (assReports[sortid] ?? []).length)
    console.log('monthly before', (assReportsMonthly[sortid] ?? []).length)
    if(yeartomonth == "yes"){
        assReportsMonthly[sortid] = assReports[sortid]
    }else{
        assReports[sortid] = assReportsMonthly[sortid]
    }
    console.log('yearly', (assReports[sortid] ?? []).length)
    console.log('monthly', (assReportsMonthly[sortid] ?? []).length)
    if(yeartomonth == "yes"){
        let putCommand = new PutObjectCommand({
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
    }else{
        let putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
            Body: JSON.stringify(assReports),
            ContentType: 'application/json'
        })
        try {
            await s3Client.send(putCommand);
        } catch (err) {
          console.log('putCommand 1 err', err); 
        }
    }
    
    const response = {statusCode: 200, body: {result: true}};
    return response;
}
