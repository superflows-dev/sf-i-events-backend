// getuserevents (projectid, userprofileid)


import { ROLE_REPORTER, ROLE_APPROVER, FINCAL_START_MONTH, REGION, TABLE, TABLE_C, TABLE_CAL, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, UpdateItemCommand, SERVER_KEY, ADMIN_METHODS, TABLE_RCM_JOBS } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';


function sleep(ms) {
  return new Promise((resolve) => { 
    setTimeout(resolve, ms);
  });
}

export const processGetRcmCalendarEvents = async (event) => {
    
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
        
        if(!authResult.result) {
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
    
    var projectid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
    } catch (e) {
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Projectid is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var queryParams = {
        KeyConditionExpression: "#projectid1 = :projectid1",
        ExpressionAttributeValues: {
          ":projectid1": { S: projectid }
        },
        ExpressionAttributeNames:  {
            "#projectid1": "projectid"
        },
        TableName: TABLE_CAL
    };
    
    const arrSerial = [];
    const ddbQuerySerial = async (queryParams, exclusiveStartKey = null) => {
        try {
            if(exclusiveStartKey != null) {
                queryParams['ExclusiveStartKey'] = exclusiveStartKey;
            }
            const data = await ddbClient.send(new QueryCommand(queryParams));
            for(var m = 0; m < data.Items.length; m++) {
                arrSerial.push(data.Items[m])
            }
            if(data.LastEvaluatedKey != null) {
                await ddbQuerySerial(queryParams, data.LastEvaluatedKey);
            }
            return;
        } catch (err) {
            sleep(2000);
            await ddbQuerySerial(queryParams, exclusiveStartKey);
            //return err;
        }
    };
    await ddbQuerySerial(queryParams);
    
    // var setParams = {
    //     TableName: TABLE_C,
    //     Key: {
    //         complianceid: {
    //             "S": complianceid
    //         },
    //         projectid: {
    //             "S": projectid
    //         }
    //     },
    //     UpdateExpression: "set #data1 = :data1",
    //     ExpressionAttributeNames: {
    //         "#data1": "data"
    //     },
    //     ExpressionAttributeValues: {
    //         ":data1": {"S": JSON.stringify(data)},
    //     },
    // };
    
    // const ddbUpdate = async (setParams) => {
    //     try {
    //       const data = await ddbClient.send(new UpdateItemCommand(setParams));
    //       return data;
    //     } catch (err) {
    //       return err;
    //     }
    // };
    
    // var resultUpdate = await ddbUpdate(setParams);
    
    const response = {statusCode: 200, body: {result: arrSerial}};
    return response;
    
}