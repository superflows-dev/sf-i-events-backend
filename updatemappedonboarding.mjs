// getunmappedevents (projectid)

import { getSignedUrl, ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, TABLE, ddbClient, UpdateItemCommand, PutObjectCommand, BUCKET_NAME, s3Client, GetObjectCommand } from "./globals.mjs";
import { processStoreMapping } from './storemapping.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { processEncryptData } from './encryptdata.mjs'
import { Buffer } from "buffer";
export const processUpdateMappedOnboarding = async (event) => {
    
    console.log('update mapped countries');
    
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
    var data = null;
    var onboardingstep = null;
    var cols = null;
    var complianceid = null;
    var presigned = null;
    var key = null;
    var delta = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        data = JSON.parse(event.body).data;
        onboardingstep = JSON.parse(event.body).onboardingstep.trim();
        cols = JSON.parse(event.body).cols;
        complianceid = JSON.parse(event.body).complianceid;
        delta = JSON.parse(event.body).delta;
        presigned = JSON.parse(event.body).presigned;
        key = JSON.parse(event.body).key;
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
    
    if(complianceid != null) {
        
        var command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_' + onboardingstep + '_job_enc.json',
        });
        
        var responseS3;
        var jsonData = {};
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
            jsonData = jsonContent;
        } catch (err) {
          console.error(err); 
          flagEncryptedNotFound = true
        }
        
        if(flagEncryptedNotFound){
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + onboardingstep + '_job.json',
            });
            
            responseS3;
            jsonData = {};
            try {
                const response = await s3Client.send(command);
                const s3ResponseStream = response.Body;
                const chunks = []
                for await (const chunk of s3ResponseStream) {
                    chunks.push(chunk)
                }
                const responseBuffer = Buffer.concat(chunks)
                const jsonContent = JSON.parse(responseBuffer.toString());
                jsonData = jsonContent;
            } catch (err) {
              console.error(err); 
            }   
        }
        
        if(jsonData.mappings != null) {
            
            if(data == null || data.length < 6) {
                const response = {statusCode: 400, body: {result: false, error: "Data is not valid!"}}
               // processAddLog(userId, 'detail', event, response, response.statusCode)
                return response;
            }
            
            if(delta == null) {
                const response = {statusCode: 400, body: {result: false, error: "Delta is not valid!"}}
               // processAddLog(userId, 'detail', event, response, response.statusCode)
                return response;
            }
            
            const newMappings = []
        
            for(var i = 0; i < jsonData.mappings.length; i++) {
                const item = jsonData.mappings[i];
                if(item.id == complianceid) {
                    item.data = data;
                    item.cols = cols;
                    item.delta = delta;
                    item.lastupdated = new Date().getTime();
                }
                newMappings.push(item);
            }
            
            jsonData.mappings = newMappings;
            let encryptedData = await processEncryptData(projectid, JSON.stringify(jsonData))
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + onboardingstep + '_job_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            responseS3;
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
              console.error(err);
            }
            
            const response = {statusCode: 200, body: {result: true}};
            return response;
            
        } else {
            
            const response = {statusCode: 404, body: {result: false, error: "Mapping file not found!"}};
            return response;
            
        }
        
        
    } else {
        
        
        if(onboardingstep == null || onboardingstep == "" || onboardingstep.length < 3) {
            const response = {statusCode: 400, body: {result: false, error: "Onboardingstep is not valid!"}}
           // processAddLog(userId, 'detail', event, response, response.statusCode)
            return response;
        }
        
        if(presigned != null && presigned) {
    
            const fileKey = projectid + '_' + (new Date().getTime()) + '_' + onboardingstep +'_job.json';
            
            const command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: fileKey,
            //   Body: data,
              ContentType: 'application/json'
            });
            
            const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            
            const response = {statusCode: 200, body: {result: true, key:fileKey, signedUrl: signedUrl}};
            return response;
            
        }
        
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });
        
        try { 
            const response = await s3Client.send(command);
            const s3ResponseStream = response.Body;
            const chunks = [];
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk);
            }
            const responseBuffer = Buffer.concat(chunks);
            data = (responseBuffer.toString());
        } catch (err) {
          console.error(err); 
        }
        
        if(data == null || data.length < 6) {
            const response = {statusCode: 400, body: {result: false, error: "Data is not valid!", data: data}} 
          // processAddLog(userId, 'detail', event, response, response.statusCode)
            return response;
        }
        
        await processStoreMapping(projectid, onboardingstep);
    
        const ddbUpdate = async () => {
            try {
                const data = await ddbClient.send(new UpdateItemCommand(updateParams));
                return data;
            } catch (err) {
                return err;
            }
        };
        
        var updateParams = {
            TableName: TABLE,
            Key: {
              projectid: { S: projectid },
            }
            
        };
        
        updateParams.UpdateExpression = "set #timestamp"+onboardingstep+"update1 = :timestamp"+onboardingstep+"update1";
        updateParams.ExpressionAttributeValues = {};
        updateParams.ExpressionAttributeValues[":timestamp"+onboardingstep+"update1"] = {"S": new Date().getTime() + ""};
        updateParams.ExpressionAttributeNames = {};
        updateParams.ExpressionAttributeNames["#timestamp"+onboardingstep+"update1"] = "timestamp"+onboardingstep+"update";
        
        await ddbUpdate();
        
        let encryptedData = await processEncryptData(projectid, data)
        command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_' + onboardingstep + '_job_enc.json',
          Body: encryptedData,
          ContentType: 'application/json'
        });
        
        try {
          responseS3 = await s3Client.send(command);
          console.log(response);
        } catch (err) {
          responseS3 = err;
          console.error(err);
        }
        
        command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key:'erroremaillist.json'
        })
        jsonData = {};
      
        try {
            const response = await s3Client.send(command);
            const s3ResponseStream = response.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            let responsedata = responseBuffer.toString()
            jsonData = JSON.parse(responsedata)    
        } catch (err) {
            console.log("list read error",err); 
        }
        
        if(jsonData[projectid] != null){
            if(jsonData[projectid].indexOf(onboardingstep) >= 0){
                delete jsonData[projectid]
                
                command = new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: 'erroremaillist.json',
                    Body: JSON.stringify(jsonData),
                    ContentType: 'application/json'
                });
                  
                try {
                    await s3Client.send(command);
                } catch (err) {
                    console.log("list save error",err);
                }
            }
        }
        const response = {statusCode: 200, body: {result: true}};
        processAddLog('1234', 'updateMappedOnboarding', event, response, response.statusCode)
        return response;
        
    }
    
    
        
        
    
   
}