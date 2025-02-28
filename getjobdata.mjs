// getunmappedevents (projectid)

import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, GetObjectCommand, BUCKET_NAME, s3Client, SERVER_KEY } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { processAddLog } from './addlog.mjs';
import { Buffer } from 'buffer'
export const processGetJobData = async (event) => {
    
    console.log('get job data');
    const userId = "1234";
    
    if((event["headers"]["x-server-key"]) != null || (event["headers"]["X-Server-Key"]) != null) {
        
        if((event["headers"]["x-server-key"]) != SERVER_KEY && (event["headers"]["X-Server-Key"]) != SERVER_KEY) {
            
            return {statusCode: 400, body: { result: false, error: "Malformed headers!", headers: event["headers"]}};
        
        }
        
    } else {
        
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
            const authoRole = authoResult.result[0]["role"] != null ? JSON.parse(authoResult.result[0]["role"].S) : "";
            
            if(!authResult.result) {
                return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
            }
            if(!authResult.admin && authoRole != ROLE_CLIENTADMIN && authoRole != ROLE_CLIENTSPOC && authoRole != ROLE_CLIENTCOORD) {
                return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
            }
        
    }
    
    // if(ADMIN_METHODS.includes("detail")) {
    //     if(!authResult.admin) {
    //         return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    //     }   
    // }
    
    var key = null;
    
    try {
        key = JSON.parse(event.body).key.trim();
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(key == null || key == "" || key.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Key is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    
    let jsonContent = {}
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        jsonContent = JSON.parse(responseBuffer.toString());
    } catch (err) {
        console.error(err);
        const response = {statusCode: 404, body: {result: false, error: "Key not present!"}}
        processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    const response = {statusCode: 200, body: {data: jsonContent}};
    return response;

}