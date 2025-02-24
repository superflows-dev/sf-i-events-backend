// getuserevents (projectid, userprofileid)


import { getSignedUrl, KMS_KEY_REGISTER, SERVER_KEY, ROLE_REPORTER, ROLE_APPROVER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR, FINCAL_START_MONTH, REGION, TABLE,  AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, ADMIN_METHODS, BUCKET_NAME, s3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, VIEW_COUNTRY, VIEW_ENTITY, VIEW_LOCATION, VIEW_TAG, BUCKET_FOLDER_REPORTING } from "./globals.mjs";
import { processIsInCurrentFincal } from './isincurrentfincal.mjs';
import { processIsMyEvent } from './ismyevent.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processDdbQuery } from './ddbquery.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processEncryptData } from './encryptdata.mjs';
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

export const processCompileAllCountryEvents = async (event) => {
    
    console.log('inside processCompileAllCountryEvents');
    
    var projectid = null;
    var userprofileid = null;
    var role = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        userprofileid = JSON.parse(event.body).userprofileid;
        role = JSON.parse(event.body).role.trim();
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
    let dates = getDates()
    let body = JSON.parse(event.body);
    body.sdate = dates.sdate
    body.edate = dates.edate
    body.year = dates.year
    body.month = "00"
    body.adhoc = "false"
    body.view = "tag"
    body.role = 'viewer'
    body.entityid = ''
    body.locationid = ''
    body.tagid = 'allevents'
    body.countryid = ''
    body.exclusivestartkey = 0
    body.searchstring = ''
    event.body = JSON.stringify(body)
    console.log('event', body)
    let responseCompute = await processComputeAllCountryEvents(event);
    if(responseCompute.statusCode !== 200){
        return responseCompute
    }
    let arrEvents = responseCompute.body.data
    console.log('inside processCompileAllCountryEvents 2', arrEvents);
    
    let responseS3
    const fileKey = projectid + '_' + userprofileid + '_' + dates.year + '_' + role +'_calendar_range_job_enc.json'
    let encryptedData = await processEncryptData(projectid, JSON.stringify(arrEvents))
    let command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
      console.error(err);
    }
    
    const response = {statusCode: 200, body: {result: true}};
    // const response = {statusCode: 200, body: {result: true, events: arrEvents}};
    return response;
    
}
function getDates() {
    let now = new Date()
    let year = now.getFullYear()
    if(now.getMonth() < 3){
        year = now.getFullYear() - 1
    }
    return {sdate: "03/31/" + year, edate: "04/01/" + (year + 1), year: year + "" } 
}
