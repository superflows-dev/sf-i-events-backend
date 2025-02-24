// getunmappedevents (projectid)

import { getSignedUrl, ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, TABLE_COU, TABLE_C, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, QueryCommand, DeleteItemCommand, BUCKET_NAME, s3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

export const processGetMappedSerializedOnboarding = async (event) => {
    
    // console.log('getting mapped serialized countries');
    
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
    
    // // if(ADMIN_METHODS.includes("detail")) {
    // //     if(!authResult.admin) {
    // //         return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    // //     }   
    // // }
    
    const userId = authResult.userId;
    
    // const userId = "1234";
    
    var projectid = null;
    var onboardingstep = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        onboardingstep = JSON.parse(event.body).onboardingstep.trim();
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
    
    if(onboardingstep == null || onboardingstep == "" || onboardingstep.length < 3) {
        const response = {statusCode: 400, body: {result: false, error: "Onboardingstep is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + onboardingstep + '_job_enc.json',
    });
    
    var responseS3;
    const storedData = {};
    let flagEncryptedNotFound = false
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        const jsonContent = JSON.parse(decryptedData);
        storedData.mappings = jsonContent;
    } catch (err) {
      console.error(err); 
      flagEncryptedNotFound = true
    }
    console.log('flagEncryptedNotFound', flagEncryptedNotFound);
    if(flagEncryptedNotFound){
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_' + onboardingstep + '_job.json',
        });
        
        var responseS3;
        // const storedData = {};
        let flagEncryptedNotFound = false
        try {
            const response = await s3Client.send(command);
            const s3ResponseStream = response.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            const jsonContent = JSON.parse(responseBuffer.toString());
            storedData.mappings = jsonContent;
        } catch (err) {
          console.error(err); 
        }
    }
    
    
    const jsonData = {};
    jsonData.mappings = [];
    
    console.log('jsonContent', Object.keys(storedData));
    
    for(var i = 0; i < storedData.mappings.mappings.length; i++) {
        
        var arr = [];
        
        
        if(onboardingstep == "countries") {
            
            for(var j = 0; j < storedData.mappings.mappings[i].countries.length; j++) {
            
                const mapping = JSON.parse(JSON.stringify(storedData.mappings.mappings[i]));
                
                mapping.countryname = storedData.mappings.mappings[i].countries[j].split(';')[0];
                mapping.countryid = storedData.mappings.mappings[i].countries[j].split(';')[1];
                
                jsonData.mappings.push(mapping);
                
            }
            
        } else if(onboardingstep == "entities") {
            
            for(var j = 0; j < storedData.mappings.mappings[i].entities.length; j++) {
            
                const mapping = JSON.parse(JSON.stringify(storedData.mappings.mappings[i]));
                
                mapping.entityname = storedData.mappings.mappings[i].entities[j].split(';')[0];
                mapping.entityid = storedData.mappings.mappings[i].entities[j].split(';')[1];
                
                jsonData.mappings.push(mapping);
                
            }
            
        } else if(onboardingstep == "locations") {
            
            for(var j = 0; j < storedData.mappings.mappings[i].locations.length; j++) {
            
                const mapping = JSON.parse(JSON.stringify(storedData.mappings.mappings[i]));
                
                mapping.locationname = storedData.mappings.mappings[i].locations[j].split(';')[0];
                mapping.locationid = storedData.mappings.mappings[i].locations[j].split(';')[1];
                
                jsonData.mappings.push(mapping);
                
            }
            
            
        } else {
            
            jsonData.mappings.push(storedData.mappings.mappings[i]);
            
        }
        
        
    }
    
    // for(var i = 0; i < jsonData.mappings.length; i++) {
        
    //     if(jsonData.mappings[i].id == "33a0deab-e93e-41b7-831a-473f9ea3eea2") {
    //         console.log(jsonData.mappings[i].locationname);
    //     }
        
    // }
    
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + onboardingstep + '_cache_job.json',
      Body: JSON.stringify(jsonData),
      ContentType: 'application/json'
    });
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
      console.error(err);
    }
    
    const fileKey = projectid + '_' + onboardingstep + '_cache_job.json';
            
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
    return response;
    
}