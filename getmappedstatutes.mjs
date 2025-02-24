// getunmappedevents (projectid)

import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE_S, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, GetObjectCommand, BUCKET_NAME, s3Client } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'

export const processGetMappedStatutes = async (event) => {
    
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
    
    const userId = authResult.userId;
    
    var projectid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
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
    
    const ddbPut = async (setParams) => {
        try {
          const data = await ddbClient.send(new PutItemCommand(setParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    
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
    
    var statutesmapping = null;
    
    if(resultGet.Item == null) {
        
        var item = {
            projectid: { S: projectid },
        };
        
        var setParams = {
            TableName: TABLE_S,
            Item: item
        };
        
        await ddbPut(setParams);
        
    } else {
        var unmarshalledItem = {};
        for(var i = 0; i < Object.keys(resultGet.Item).length; i++) {
            unmarshalledItem[Object.keys(resultGet.Item)[i]] = resultGet.Item[Object.keys(resultGet.Item)[i]][Object.keys(resultGet.Item[Object.keys(resultGet.Item)[i]])[0]];
        }
        statutesmapping = unmarshalledItem.statutesmapping;
    
    }
    
    var jsonstatutesmapping = null;
    if(statutesmapping == null) {
        jsonstatutesmapping = {mappings: {mappings: [], searchstring: ""}};
    } else {
        jsonstatutesmapping = JSON.parse(statutesmapping);
        
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_statutes_job_enc.json',
        });
        
        var responseS3;
        let flagFoundEncrypted = true;
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
            jsonstatutesmapping.mappings = jsonContent;
        } catch (err) {
          console.error(err); 
          flagFoundEncrypted = false;
        }
        
        if(!flagFoundEncrypted){
            const command = new GetObjectCommand({
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
                const jsonContent = JSON.parse(responseBuffer.toString());
                jsonstatutesmapping.mappings = jsonContent;
            } catch (err) {
              console.error(err); 
            }
        }
        
    }
    
    const response = {statusCode: 200, body: {result: true, data: {mappings: jsonstatutesmapping}}};
    return response;
    
}