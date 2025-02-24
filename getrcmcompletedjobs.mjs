// getuserevents (projectid, userprofileid)


import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ROLE_REPORTER, ROLE_APPROVER, FINCAL_START_MONTH, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, ADMIN_METHODS, TABLE_RCM_JOBS, SERVER_KEY } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const processGetRcmCompletedJobs = async (event) => {
    
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
    
    
    // var getParams = {
    //     TableName: TABLE,
    //     Key: {
    //       projectid: { S: projectid },
    //     },
    // };
    
    var scanParams = {
        FilterExpression: "#status1 = :status1",
        ExpressionAttributeValues: {
          ":status1": { S: "2" }
        },
        ExpressionAttributeNames:  {
            "#status1": "status"
        },
        TableName: TABLE_RCM_JOBS
    };
    
    console.log(scanParams);
    
    const arrSerial = [];
    const ddbQuerySerial = async (queryParams, exclusiveStartKey = null) => {
        try {
            if(exclusiveStartKey != null) {
                queryParams['ExclusiveStartKey'] = exclusiveStartKey;
            }
            const data = await ddbClient.send(new ScanCommand(queryParams));
            for(var m = 0; m < data.Items.length; m++) {
                arrSerial.push(data.Items[m])
            }
            if(data.LastEvaluatedKey != null) {
                await ddbQuerySerial(queryParams, data.LastEvaluatedKey);
            }
            return;
        } catch (err) {
            await sleep(2000);
            ddbQuerySerial(queryParams, exclusiveStartKey);
            // console.log(err);
            // return err;
        }
    };
    await ddbQuerySerial(scanParams);
    
    const jobs = [];
    
    for(var i = 0; i < arrSerial.length; i++) {
        const jobTime = new Date(JSON.parse(arrSerial[i].data.S).trigger.date).getTime();
        const currTime = new Date().getTime();
        console.log('job', jobTime, currTime);
        if(currTime > jobTime) {
            jobs.push(arrSerial[i]);
        }
    }
    
    const response = {statusCode: 200, body: {result: true, data: jobs}};
    return response;
    
}