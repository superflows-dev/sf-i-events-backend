// getunmappedevents (projectid)

import { getSignedUrl, ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, TABLE, TABLE_S, ddbClient, UpdateItemCommand, GetItemCommand, PutItemCommand, BUCKET_NAME, s3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from "./globals.mjs";
import { processStoreMapping } from './storemapping.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { processAddLog } from './addlog.mjs';
import { processEncryptData } from './encryptdata.mjs'
import { processDecryptData } from './decryptdata.mjs'
import { Buffer } from "buffer";
export const processUpdateMappedStatutes = async (event) => {
    
    console.log('getting mapped statutes');
     
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
    var presigned = null;
    var key = null;
    var compliancessearchstring = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        compliancessearchstring = JSON.parse(event.body).compliancessearchstring;
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
    
    if(presigned != null && presigned) {
    
        const fileKey = projectid + '_' + (new Date().getTime()) + '_statutes_job.json';
        
        var command = new PutObjectCommand({
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
    
    if(compliancessearchstring == null || compliancessearchstring.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Compliancessearchstring is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var data = null;
    
    command = new GetObjectCommand({
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
    
    await processStoreMapping(projectid, 'statutes');
    
    var getParams = {
        TableName: TABLE_S,
        Key: {
          projectid: { S: projectid },
        },
    };
    
    async function ddbGet (getParams) {
        try {
          const data = await ddbClient.send(new GetItemCommand(getParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    var resultGet = await ddbGet(getParams);
    
    const jsonData = JSON.parse(data);
    const jsonDataCopy = JSON.parse(data);
    
    
    for(i = 0; i < jsonData.mappings.length; i++) {
     
        jsonData.mappings[i].countryname = JSON.parse(jsonData.mappings[i].data[0])[0][0]
        jsonData.mappings[i].statutename = JSON.parse(jsonData.mappings[i].data[0])[3]
        delete jsonData.mappings[i].data;
        delete jsonData.mappings[i].cols;
        
    }
    
    var resultCompare = null;
    
    if(resultGet.Item == null) {
        
         const item = {
            projectid: {"S": projectid},
            statutesmapping: {"S": JSON.stringify({"searchstring": jsonData.searchstring})}
        }
        
        var setParams = {
            TableName: TABLE_S,
            Item: item
        };
        
        const ddbPut = async () => {
            try {
              const data = await ddbClient.send(new PutItemCommand(setParams));
              return data;
            } catch (err) {
              return err;
            }
        };
        
        await ddbPut();
        let encryptedData = await processEncryptData(projectid, JSON.stringify(jsonData.mappings))
        command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_statutes_job_enc.json',
          Body: encryptedData,
          ContentType: 'application/json'
        });
        
        responseS3;
        
        try {
          responseS3 = await s3Client.send(command);
          console.log(response);
        } catch (err) {
          responseS3 = err;
          console.error(err);
        }
        
    } else {
        
        if(resultGet.Item.statutesmapping == null) {
            let encryptedData = await processEncryptData(projectid, JSON.stringify(jsonData.mappings))
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_statutes_job_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            var responseS3;
            
            try {
              responseS3 = await s3Client.send(command);
              console.log(response);
            } catch (err) {
              responseS3 = err;
              console.error(err);
            }
            
            
        } else {
            
            
            // const dbArr = JSON.parse(resultGet.Item.statutesmapping.S).mappings;
            const rxArr = jsonData.mappings;
            var dbArr = null; 
            
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_statutes_job_enc.json',
            });
            
            responseS3;
            let flagReadError = false
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
              flagReadError = true;
            }
            if(flagReadError){
                command = new GetObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: projectid + '_statutes_job.json',
                });
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
                }
            }
            
            
            for(var i = 0; i < rxArr.length; i++) {
                
                // loop through received array
                if(dbArr == null) continue;
                
                for(var j = 0; j < dbArr.length; j++) {
                    
                    // looop through existing array
                    
                    if(dbArr[j].id == rxArr[i].id) {
                        
                        // when the compliance line item matches
                        
                        if(dbArr[j].extraFields.length == null) {
                            // sanity check
                            continue;
                        }
                        
                        for(var k = 0; k < dbArr[j].extraFields.length; k++) {
                            
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
                                
                                if(rxArr[i].id == "f4841840-7532-4c43-9b77-078a8e0e3ea6") {
                                    resultCompare = {
                                        comparison: jsonData.updatedrows.includes(rxArr[i].id),
                                        receivedItem: rxArr[i].extraFields,
                                        dbItem: dbArr[j].extraFields
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
            
            if(dbArr != null) {
            
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
                        newDbArr.push(dbArr[i]);
                    }
                    
                }
                
            }
            
            let encryptedData = await processEncryptData(projectid, JSON.stringify(newDbArr))
            
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_statutes_job_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              await s3Client.send(command);
              console.log(response);
            } catch (err) {
              console.log(err);
              console.error(err);
            }
            
          
            
        }
        
        
    }
    
    resultGet = await ddbGet(getParams);

    
    compliancessearchstring = '';
    
    // var copyE = jsonDataCopy.mappings;
        
    for(i = 0; i < jsonDataCopy.mappings.length; i++) {
        
        // copyE = (JSON.parse(jsonDataCopy.mappings[i].selected));
        
        if(JSON.parse(jsonDataCopy.mappings[i].selected)) {
            
            compliancessearchstring += JSON.parse(jsonDataCopy.mappings[i].data)[3];
            if(i < (jsonDataCopy.mappings.length - 1)) {
                
                compliancessearchstring += '|';
                
            }
            
        }
        
    }
    
    compliancessearchstring = compliancessearchstring.slice(0, -1)
    
    var updateParams = {
        TableName: TABLE_S,
        Key: {
          projectid: { S: projectid },
        },
        UpdateExpression: "set #compliancessearchstring1 = :compliancessearchstring1, #statutesmapping1 = :statutesmapping1",
        ExpressionAttributeValues: {
            ":compliancessearchstring1": {"S": compliancessearchstring},
            ":statutesmapping1": {"S": JSON.stringify({"searchstring": jsonData.searchstring})}
        },
        ExpressionAttributeNames:  {
            "#compliancessearchstring1": "compliancessearchstring",
            "#statutesmapping1": "statutesmapping"
        }
    };
    
    const ddbUpdate = async () => {
        try {
            const data = await ddbClient.send(new UpdateItemCommand(updateParams));
            return data;
        } catch (err) {
            return err;
        }
    };
  
    await ddbUpdate();
    
    updateParams = {
        TableName: TABLE,
        Key: {
          projectid: { S: projectid },
        },
        UpdateExpression: "set #timestampstatutesupdate1 = :timestampstatutesupdate1",
        ExpressionAttributeValues: {
            ":timestampstatutesupdate1": {"S": new Date().getTime() + ""}
        },
        ExpressionAttributeNames:  {
            "#timestampstatutesupdate1": "timestampstatutesupdate"
        }
    };
    
    await ddbUpdate();
    
    const deleteCommand = new DeleteObjectCommand ({
      "Bucket": BUCKET_NAME,
      "Key": key
    });
    
    try {
        await s3Client.send(deleteCommand);
    } catch (err) {
        console.log(err);
    }
    
    const response = {statusCode: 200, body: {result: true, resultCompare: resultCompare}};
    processAddLog('1234', 'updateMappedStatutes', event, response, response.statusCode)
    return response;
    

}