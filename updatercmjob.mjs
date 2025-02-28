// getuserevents (projectid, userprofileid)


import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ddbClient, UpdateItemCommand, TABLE_RCM_JOBS, SERVER_KEY } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { Buffer } from "buffer";

export const processUpdateRcmJob = async (event) => {
    
    
    if((event["headers"]["x-server-key"]) != null) {
        
        if((event["headers"]["x-server-key"]) != SERVER_KEY) {
            
            return {statusCode: 401, body: {result: false, error: "Unauthorized request!", headers: event["headers"]["x-server-key"], key: SERVER_KEY}}; 
        
        } 
        
    } else if ((event["headers"]["X-Server-Key"]) != null) {
        
        if((event["headers"]["X-Server-Key"]) != SERVER_KEY) {
            
            return {statusCode: 401, body: {result: false, error: "Unauthorized request!", headers: event["headers"]["X-Server-Key"], key: SERVER_KEY}}; 
        
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
        
        // if(ADMIN_METHODS.includes("detail")) {
        //     if(!authResult.admin) {
        //         return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
        //     }   
        // }
        
    
    }
    
    // const userId = "1234";
    
    var complianceid = null;
    var id = null;
    var status = null;
    
    try {
        complianceid = JSON.parse(event.body).complianceid.trim();
        id = JSON.parse(event.body).id.trim();
        status = JSON.parse(event.body).status.trim();
    } catch (e) {
        console.log('error', e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(complianceid == null || complianceid == "" || complianceid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Complianceid is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(id == null || id == "" || id.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(status == null || status == "") {
        const response = {statusCode: 400, body: {result: false, error: "Status is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var setParams = {
        TableName: TABLE_RCM_JOBS,
        Key: {
            complianceid: {
                "S": complianceid
            },
            id: {
                "S": id
            }
        },
        UpdateExpression: "set #status1 = :status1",
        ExpressionAttributeNames: {
            "#status1": "status"
        },
        ExpressionAttributeValues: {
            ":status1": {"S": status},
        },
    };
    
    const ddbUpdate = async (setParams) => {
        try {
          const data = await ddbClient.send(new UpdateItemCommand(setParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    await ddbUpdate(setParams);
    
    const response = {statusCode: 200, body: {result: true}};
    return response;
    
}