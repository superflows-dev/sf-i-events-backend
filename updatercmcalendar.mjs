// getuserevents (projectid, userprofileid)


import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ROLE_REPORTER, ROLE_APPROVER, FINCAL_START_MONTH, REGION, TABLE, TABLE_C, TABLE_CAL_JOBS, TABLE_CAL, TABLE_T, TABLE_R, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, UpdateItemCommand, ADMIN_METHODS, TABLE_RCM_JOBS, SERVER_KEY } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const processUpdateRcmCalendar = async (event) => {
    
    var serverkey = "";
    var userId = "1234"
    
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
        
        userId = authResult.userId;
    
    }
    
    // const userId = "1234";
    
    var sortid = null;
    var projectid = null;
    var data = null;
    
    try {
        sortid = JSON.parse(event.body).sortid.trim();
        projectid = JSON.parse(event.body).projectid.trim();
        data = JSON.parse(event.body).data;
    } catch (e) {
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(sortid == null || sortid == "" || sortid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Sortid is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Projectid is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(data == null || data == "") {
        const response = {statusCode: 400, body: {result: false, error: "Data is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    
    var setParams = {
        TableName: TABLE_CAL,
        Key: {
            sortid: {
                "S": sortid
            },
            projectid: {
                "S": projectid
            }
        },
        UpdateExpression: "set #data1 = :data1",
        ExpressionAttributeNames: {
            "#data1": "data"
        },
        ExpressionAttributeValues: {
            ":data1": {"S": JSON.stringify(data)},
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
    
    var resultUpdate = await ddbUpdate(setParams);
    
    const response = {statusCode: 200, body: {result: true}};
    return response;
    
}