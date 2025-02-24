// getuserevents (projectid, userprofileid)


import { getSignedUrl, KMS_KEY_REGISTER, SERVER_KEY, ROLE_REPORTER, ROLE_APPROVER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR, FINCAL_START_MONTH, REGION, TABLE,  AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, ADMIN_METHODS, BUCKET_NAME, s3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, VIEW_COUNTRY, VIEW_ENTITY, VIEW_LOCATION, VIEW_TAG, BUCKET_FOLDER_REPORTING } from "./globals.mjs";
import { processIsInCurrentFincal } from './isincurrentfincal.mjs';
import { processIsMyEvent } from './ismyevent.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processDdbQuery } from './ddbquery.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processComputeAllCountryEvents } from './computeallcountryevents.mjs'
import crypto from 'crypto';
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const processGetAllCountryEvents1 = async (event) => {
    
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
    var projectid = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
    } catch (e) {
        console.log('params error', e)
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    let responseCompute = await processComputeAllCountryEvents(event);
    if(responseCompute.statusCode !== 200){
        return responseCompute
    }
    let arrEvents = responseCompute.body.data
    let lastEvaluatedKey = responseCompute.body.lastEvaluatedKey
    console.log('inside processGetAllCountryEvents 2');
    
    const currTs = new Date().getTime();
    let responseS3
    const fileKey = projectid + '_' + currTs + '_view_job.json';
    
    let command = new PutObjectCommand({
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
    
    const response = {statusCode: 200, body: {result: true, signedUrlGet: signedUrlGet, signedUrlDelete: signedUrlDelete, lastEvaluatedKey: lastEvaluatedKey}};
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
