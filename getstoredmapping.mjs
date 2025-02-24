// getunmappedevents (projectid)

import { NUM_ONBOARDING_BACKUPS, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, TABLE_COU, TABLE_LOC, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, UpdateItemCommand, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, DeleteItemCommand, QueryCommand, TABLE_COU_JOBS, PutObjectCommand, BUCKET_NAME, s3Client} from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processSfIEventsAddToQueueSfCalendar } from './addtoqueuesfcalendar.mjs'

export const processGetStoredMapping = async (event) => {
    
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
    
    // if(ADMIN_METHODS.includes("detail")) {
    //     if(!authResult.admin) {
    //         return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    //     }   
    // }
    
    const userId = authResult.userId;
    
    var projectid = null;
    var flow = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        flow = JSON.parse(event.body).flow.trim();
    } catch (e) {
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(flow == null || flow == "" || flow.length < 2) {
        const response = {statusCode: 400, body: {result: false, error: "Flow is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    const mappings = [];
    
    //for(var i = 0; i <= NUM_ONBOARDING_BACKUPS; i++) {
        
        let jsonContent = null;
        
        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: projectid + '_'+flow+'_job.json',    
        });
        
        try {
            const response = await s3Client.send(getCommand);
            const s3ResponseStream = response.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            jsonContent = JSON.parse(responseBuffer.toString());
        } catch (err) {
          console.error(err); 
        }
        
        if(jsonContent != null) {
            mappings.push(jsonContent)
        }
        
    //}
    
    
    const response = {statusCode: 200, body: {result: true, data: mappings}};
    return response;
    
}