// getunmappedevents (projectid)

import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, TABLE, ddbClient, UpdateItemCommand, BUCKET_NAME, s3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand, getSignedUrl } from "./globals.mjs";
import { processStoreMapping } from './storemapping.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { processAddLog } from './addlog.mjs';
import { processEncryptData } from './encryptdata.mjs'
import { processDecryptData } from './decryptdata.mjs'
import { Buffer } from "buffer";
export const processUpdateMappedCompliances = async (event) => {
     
    console.log('update mapped compliances');
    
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
    
    // const userId = authResult.userId;
    
    
    var projectid = null;
    var presigned = null;
    var key = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
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
    
    
    
    // await processStoreMapping(projectid, 'compliances');
    
    if(presigned != null && presigned) {
    
        const fileKey = projectid + '_' + (new Date().getTime()) + '_compliances_job.json';
        
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
    
    if(key == null || key.length < 3) {
        const response = {statusCode: 400, body: {result: false, error: "Key is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var data = null;
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    try { 
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        data = (responseBuffer.toString());
    } catch (err) {
      console.error(err); 
    }
    
    if(data == null || data.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Data is not valid!", data: data}} 
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    await processStoreMapping(projectid, 'compliances');
    
    const jsonData = JSON.parse(data);
    
    var arrSerialNew = null;
    
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_compliances_versions_job_enc.json',
    });
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
        arrSerialNew = JSON.parse(decryptedData);
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
            const response = await s3Client.send(command);
            const s3ResponseStream = response.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            arrSerialNew = JSON.parse(responseBuffer.toString());
        } catch (err) {
          console.error(err); 
        } 
    }
    
    for(var i = 0; i < jsonData.mappings.length; i++) {
        
        const id = jsonData.mappings[i].id;
        const batch = jsonData.batch;
        
        // if(arrCompliancesFrequencies[id] != null) {
        //     continue;
        // } else {
        //     arrCompliancesFrequencies[id] = 0;
        // }
        
        
        var compliance = {};
        for(var j = 0; j < JSON.parse(jsonData.mappings[i].cols).length; j++) {
            compliance[JSON.parse(jsonData.mappings[i].cols)[j]] = JSON.parse(jsonData.mappings[i].data)[j]
        }
        
        if(arrSerialNew == null) {
            arrSerialNew = {};
        }
        
        if(arrSerialNew[projectid + ";" + id] == null) {
          arrSerialNew[projectid + ";" + id] = {};
        }
        if(arrSerialNew[projectid + ";" + id][batch] == null) {
            
            var max = -1;
            for(var k = 0; k < Object.keys(arrSerialNew[projectid + ";" + id]).length; k++) {
                
                const keyValue = Object.keys(arrSerialNew[projectid + ";" + id])[k];
                if(parseInt(keyValue) > max) {
                    max = keyValue;
                }
                
            }
            
            if(max > 0) {
                
                if(arrSerialNew[projectid + ";" + id][max].data.S != JSON.stringify(compliance)) {
                
                    arrSerialNew[projectid + ";" + id][batch] = {
                        data: {"S": JSON.stringify(compliance)},
                        batch: {"S": batch + ""}
                    };
                    
                } else {
                    
                    delete arrSerialNew[projectid + ";" + id][max];
                    
                    arrSerialNew[projectid + ";" + id][batch] = {
                        data: {"S": JSON.stringify(compliance)},
                        batch: {"S": batch + ""}
                    }; 
                    
                }
                
            } else {
                
                arrSerialNew[projectid + ";" + id][batch] = {
                        data: {"S": JSON.stringify(compliance)},
                        batch: {"S": batch + ""}
                    }; 
                
            }
            
        }
        
    }
    
    let encryptedData = await processEncryptData(projectid, JSON.stringify(arrSerialNew))
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_compliances_versions_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    var responseS3;
    
    try {
      responseS3 = await s3Client.send(command);
    //   console.log(responseS3);
    } catch (err) {
      responseS3 = err;
      console.error(err);
    }
    
    for(i = 0; i < jsonData.mappings.length; i++) {
     
        delete jsonData.mappings[i].data;
        delete jsonData.mappings[i].cols;
        
    }
    
    const rxArr = jsonData.mappings;
    var dbArr = null; 
            
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_compliances_job_enc.json',
    });
    flagEncryptedNotFound = false
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        dbArr = JSON.parse(decryptedData);
    } catch (err) {
      console.error(err); 
      flagEncryptedNotFound = true
    }
    
    if(flagEncryptedNotFound){
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_compliances_job.json',
        });
        flagEncryptedNotFound = false
        try {
            const response = await s3Client.send(command);
            const s3ResponseStream = response.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            dbArr = JSON.parse(responseBuffer.toString());
        } catch (err) {
          console.error(err); 
          flagEncryptedNotFound = true
        }
    }    
    
    for(i = 0; i < rxArr.length; i++) {
                
        // loop through received array
        
        if(dbArr == null) continue; 
        
        for(j = 0; j < dbArr.length; j++) {
            
            // looop through existing array
            
            if(dbArr[j].id == rxArr[i].id) {
                
                // when the compliance line item matches
                
                if(dbArr[j].extraFields.length == null) {
                    // sanity check
                    continue;
                }
                
                for(k = 0; k < dbArr[j].extraFields.length; k++) {
                    
                    // Loop through all the extra fields of the existing array
                    // Idea is to preserve the existing array and update only the modified fields in the received array
                    
                    if(Object.keys(dbArr[j].extraFields[k]).length == null) {
                        // sanity check
                        continue;
                    }
                    
                    for(var l = 0; l < Object.keys(dbArr[j].extraFields[k]).length; l++) {
                        
                        // Loop through the fields of every existing extra field value
                        
                        var found = false;
                        
                        for(var m = 0; m < rxArr[i].updatedFields.length; m++) {
                            
                            // // Loop through the modified fields array for that compliance item from the received array
                    
                            if(rxArr[i].updatedFields[m] == Object.keys(dbArr[j].extraFields[k])[l]) {
                                // Set the flag if that field is modified
                                found = true;
                                break;
                            }
                            
                        }
                        
                        if(!jsonData.updatedrows.includes(rxArr[i].id)) {
                            rxArr[i].extraFields[k][Object.keys(dbArr[j].extraFields[k])[l]] = dbArr[j].extraFields[k][Object.keys(dbArr[j].extraFields[k])[l]]
                        } else {
                            if(!found) {
                                // If that field is not modified, preseve the old value
                                rxArr[i].extraFields[k][Object.keys(dbArr[j].extraFields[k])[l]] = dbArr[j].extraFields[k][Object.keys(dbArr[j].extraFields[k])[l]]
                                
                            }
                        }
                        
                        
                    }
                    
                }
                
            }

        }
        
    }
    
    
    const newDbArr = [];
    
    for(i = 0; i < rxArr.length; i++) {
        
        
        newDbArr.push(rxArr[i]);
        
    }
    
    if(dbArr != null && dbArr.length != null) {
        
        for(i = 0; i < dbArr.length; i++) {
        
            const idDb = dbArr[i].id;
            found = false;

                for(j = 0; j < rxArr.length; j++) {
                    const idRx = rxArr[j].id;   
                    if(idDb == idRx) {
                        found = true;
                    }
                }    
            
            
            if(!found) {
                if(idDb.indexOf(' ') < 0) {
                    if(idDb.length == 0) {
                        newDbArr.push(dbArr[i]);    
                    }
                }
            }
            
        }
        
        jsonData["mappings"] = newDbArr;
        
    }
    encryptedData = await processEncryptData(projectid, JSON.stringify(newDbArr))
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_compliances_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    responseS3;
    
    try {
      responseS3 = await s3Client.send(command);
    //   console.log(response);
    } catch (err) {
      responseS3 = err;
      console.error(err);
    }
    
    const ddbUpdate = async (updateParams) => {
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
        },
        UpdateExpression: "set #timestampcompliancesupdate1 = :timestampcompliancesupdate1",
        ExpressionAttributeValues: {
            ":timestampcompliancesupdate1": {"S": new Date().getTime() + ""}
        },
        ExpressionAttributeNames:  {
            "#timestampcompliancesupdate1": "timestampcompliancesupdate"
        }
    };
    
    await ddbUpdate(updateParams);
    
    const deleteCommand = new DeleteObjectCommand ({
      "Bucket": BUCKET_NAME,
      "Key": key
    });
    
    try {
        await s3Client.send(deleteCommand);
    } catch (err) {
        console.log(err)
    }
    
    
    const response = {statusCode: 200, body: {result: true, arrSerialNew: jsonData.mappings}};
    processAddLog('1234', 'updateMappedCompliances', event, response, response.statusCode)
    return response;
    

}