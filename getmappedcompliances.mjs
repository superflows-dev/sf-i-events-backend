// getunmappedevents (projectid)

import { getSignedUrl, ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE_S, TABLE_C, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, ADMIN_METHODS, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, BUCKET_NAME, s3Client } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { newUuidV4 } from './newuuid.mjs';

import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { processEncryptData } from './encryptdata.mjs'

async function sleep(ms) {
  return new Promise((resolve) => { 
    setTimeout(resolve, ms);
  });
}

export const processGetMappedCompliances = async (event) => {
     
    console.log('getting mapped compliances');
    
    
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
    
    // const userId = "1234";
    
    var projectid = null;
    var complianceid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        complianceid = JSON.parse(event.body).complianceid;
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
    
    var getParams = {
        TableName: TABLE_S,
        Key: {
          projectid: { S: projectid },
        },
    };
    
    async function ddbGet () {
        try {
          const data = await ddbClient.send(new GetItemCommand(getParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    var resultGet = await ddbGet();
    
    if(resultGet.Item == null) {
        if(complianceid != null) { 
            const response = {statusCode: 404, body: {result: false, found: false, error: "Record does not exist!"}}
            // processAddLog(userId, 'detail', event, response, response.statusCode)
            return response;
        } else {
            const response = {statusCode: 404, body: {result: false, error: "Record does not exist!"}}
           // processAddLog(userId, 'detail', event, response, response.statusCode)
            return response;    
        }
        
    }
    
    var unmarshalledItem = {};
    for(var i = 0; i < Object.keys(resultGet.Item).length; i++) {
        unmarshalledItem[Object.keys(resultGet.Item)[i]] = resultGet.Item[Object.keys(resultGet.Item)[i]][Object.keys(resultGet.Item[Object.keys(resultGet.Item)[i]])[0]];
    }
     
    var compliancessearchstring = unmarshalledItem.compliancessearchstring;
    var compliancesmapping = unmarshalledItem.compliancesmapping;
    var jsoncompliancesmapping = {};
    if(compliancesmapping == null) {
        jsoncompliancesmapping = {"searchstring": compliancessearchstring, "mappings": []};
    } 
    
    // else {
        // jsoncompliancesmapping = JSON.parse(compliancesmapping);
        
        var command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_compliances_job_enc.json',
        });
        
        var responseS3;
        let flagEncryptedNotFound = false
        try {
            var response = await s3Client.send(command);
            var s3ResponseStream = response.Body;
            var chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            var responseBuffer = Buffer.concat(chunks)
            let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
            var jsonContent = JSON.parse(decryptedData);
            jsoncompliancesmapping.mappings = jsonContent;
            
            
            response = null;
            s3ResponseStream = null;
            chunks = null;
            responseBuffer = null;
            jsonContent = null;
            
            
        } catch (err) {
          console.error(err); 
          flagEncryptedNotFound = true
        }
        
        console.log('flagEncryptedNotFound 1', flagEncryptedNotFound);
        
        if(flagEncryptedNotFound){
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_compliances_job.json',
            });
            
            try {
                response = await s3Client.send(command);
                s3ResponseStream = response.Body;
                chunks = []
                for await (const chunk of s3ResponseStream) {
                    chunks.push(chunk)
                }
                responseBuffer = Buffer.concat(chunks)
                jsonContent = JSON.parse(responseBuffer.toString());
                jsoncompliancesmapping.mappings = jsonContent;
                 
                
                response = null;
                s3ResponseStream = null;
                chunks = null;
                responseBuffer = null;
                jsonContent = null;
                
                
            } catch (err) {
              console.error(err); 
            }
        }
        
        jsoncompliancesmapping.searchstring = compliancessearchstring;
        
        var found = false;
        
        if(complianceid != null) {
    
            for(var i = 0; i < jsoncompliancesmapping.mappings.length; i++) {
                
                if(jsoncompliancesmapping.mappings[i].id == complianceid) {
                    found = jsoncompliancesmapping.mappings[i].selected;
                    break;
                }
                
            }
            
            const response = {statusCode: 200, body: {result: true, found: found}};
            return response;
        }
        
        
        
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_compliances_versions_job_enc.json',
        });
        
        responseS3;
        
        var arrSerial = {};
        flagEncryptedNotFound = false
        try {
            response = await s3Client.send(command);
            s3ResponseStream = response.Body;
            chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            responseBuffer = Buffer.concat(chunks)
            let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
            jsonContent = JSON.parse(decryptedData);
            arrSerial = jsonContent;
            
            response = null;
            s3ResponseStream = null;
            chunks = null;
            responseBuffer = null;
            jsonContent = null;
            
            
        } catch (err) {
          console.error(err); 
          flagEncryptedNotFound = true
        }
        
        if(flagEncryptedNotFound){
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_compliances_versions_job.json',
            });
            
            try {
                response = await s3Client.send(command);
                s3ResponseStream = response.Body;
                chunks = []
                for await (const chunk of s3ResponseStream) {
                    chunks.push(chunk)
                }
                responseBuffer = Buffer.concat(chunks)
                jsonContent = JSON.parse(responseBuffer.toString());
                arrSerial = jsonContent;
                
                response = null;
                s3ResponseStream = null;
                chunks = null;
                responseBuffer = null;
                jsonContent = null;
                
                
            } catch (err) {
              console.error(err); 
            }
        }
        
        if(Object.keys(arrSerial).length > 0) {
            
            const mappings = [];
        
            for(var i = 0; i < jsoncompliancesmapping.mappings.length; i++) {
                
                const id = jsoncompliancesmapping.mappings[i].id;
                
                if(arrSerial[projectid + ';' + id] != null) {
                    
                    const keysOfCompliance = Object.keys(arrSerial[projectid + ';' + id]);
                
                    var max = -1;
                    
                    for(var j = 0; j < keysOfCompliance.length; j++) {
                        
                        if(parseInt(keysOfCompliance[j]) > max) {
                            max = parseInt(keysOfCompliance[j]);
                        }
                        
                    }
                    
                    var cols = [];
                    var data = [];
        
                    cols = Object.keys(JSON.parse(arrSerial[projectid + ';' + id][max].data.S));
                    
                    for(var j = 0; j < cols.length; j++) {
                        data.push(JSON.parse(arrSerial[projectid + ';' + id][max].data.S)[cols[j]])
                    }
                    jsoncompliancesmapping.mappings[i].data = JSON.stringify(data);
                    jsoncompliancesmapping.mappings[i].cols = JSON.stringify(cols);
                    
                    
                }
                
                
                
            }
            
            
        }
        
        
    // }
    
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_compliances_cache_job.json',
      Body: JSON.stringify(jsoncompliancesmapping),
      ContentType: 'application/json'
    });
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
      console.error(err);
    }
    
    const fileKey = projectid + '_compliances_cache_job.json';
            
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
    
    response = {statusCode: 200, body: {result: true, key:fileKey, signedUrlGet: signedUrlGet, signedUrlDelete: signedUrlDelete}};
    return response;
    
    
    // const response = {statusCode: 200, body: {result: true, data: {mappings: jsoncompliancesmapping}}};
    // return response;
    

}