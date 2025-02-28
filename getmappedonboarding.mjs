// getunmappedevents (projectid)

import { getSignedUrl, ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, BUCKET_NAME, s3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { Buffer } from 'buffer'

export const processGetMappedOnboarding = async (event) => {
    
    console.log('getting mapped locations');
    
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
    
    // const userId = "1234";
    
    var projectid = null;
    var onboardingstep = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        onboardingstep = JSON.parse(event.body).onboardingstep.trim();
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
    
    if(onboardingstep == null || onboardingstep == "" || onboardingstep.length < 3) {
        const response = {statusCode: 400, body: {result: false, error: "Onboardingstep is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var fileKey = projectid + '_' + onboardingstep + '_job_enc.json';
    let flagEncryptedNotFound = false        
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    let jsonContent = {}
    try {
        let response = await s3Client.send(command);
        let s3ResponseStream = response.Body;
        let chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        let responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        jsonContent = JSON.parse(decryptedData);
    } catch (err) {
      console.error(err);
      flagEncryptedNotFound = true
    }
    console.log('flagEncryptedNotFound', flagEncryptedNotFound);
    if(flagEncryptedNotFound){
        fileKey = projectid + '_' + onboardingstep + '_job.json';
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          ContentType: 'application/json'
        });
        try {
            let response = await s3Client.send(command);
            let s3ResponseStream = response.Body;
            let chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            let responseBuffer = Buffer.concat(chunks)
            let decryptedData = responseBuffer.toString()
            jsonContent = JSON.parse(decryptedData);
        } catch (err) {
          console.error(err);
        }
    }
    
    // console.log(jsonContent);
    // const signedUrlGet = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + onboardingstep + '_cache_job.json',
      Body: JSON.stringify(jsonContent),
      ContentType: 'application/json'
    });
    
    try {
      await s3Client.send(command);
    } catch (err) {
      console.error(err);
    }
    
    fileKey = projectid + '_' + onboardingstep + '_cache_job.json';
            
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    
    const signedUrlGet = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    const signedUrlDelete = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    const response = {statusCode: 200, body: {result: true, key:fileKey, signedUrlGet: signedUrlGet, signedUrlDelete: signedUrlDelete}};
    
    // const response = {statusCode: 200, body: {result: true, key:fileKey, signedUrlGet: signedUrlGet}};
    return response;
    
}