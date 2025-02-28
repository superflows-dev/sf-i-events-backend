// getunmappedevents (projectid)

import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, TABLE_C, ddbClient, ScanCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { Buffer } from 'buffer'

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


export const processGetMappedProjects = async (event) => {
    
    console.log('getting mapped projects');
    
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
    
    //const userId = "1234";
    
    var complianceid = null;
    
    try {
        complianceid = JSON.parse(event.body).complianceid.trim();
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(complianceid == null || complianceid == "" || complianceid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
     var queryParams = {
        FilterExpression: "#complianceid1 = :complianceid1",
        ExpressionAttributeValues: {
          ":complianceid1": { S: complianceid }
        },
        ExpressionAttributeNames:  {
            "#complianceid1": "complianceid"
        },
        ProjectionExpression: "projectid",
        TableName: TABLE_C
    };
    
    console.log(queryParams);
    
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
            console.log(err);
            // return err;
        }
    };
    await ddbQuerySerial(queryParams);
    
    const response = {statusCode: 200, body: {result: true, data: arrSerial}};
    return response;
    
}