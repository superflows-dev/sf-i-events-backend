// getuserevents (projectid, userprofileid)


import { BUCKET_NAME, s3Client, PutObjectCommand } from "./globals.mjs";
import { processEncryptData } from './encryptdata.mjs';
import { processComputeAllCountryEvents } from './computeallcountryevents.mjs'

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
    
    const fileKey = projectid + '_' + userprofileid + '_' + dates.year + '_' + role +'_calendar_range_job_enc.json'
    let encryptedData = await processEncryptData(projectid, JSON.stringify(arrEvents))
    let command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    try {
      await s3Client.send(command);
    } catch (err) {
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
