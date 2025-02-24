// getunmappedevents (projectid)

import { ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand, QueryCommand, ADMIN_METHODS, FINCAL_START_MONTH, UpdateItemCommand, SERVER_KEY } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import * as https from 'https';
import { processSfIEventsAddToQueue } from './addtoqueue.mjs'

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const processDdbQuery = async (event) => {
    
    // console.log('getting mapped calendar');
    // console.log('event', event);
    
    // if((event["headers"]["x-server-key"]) != null) {
        
    //     if((event["headers"]["x-server-key"]) != SERVER_KEY) {
            
    //         return {statusCode: 401, body: {result: false, error: "Unauthorized request!", headers: event["headers"]["x-server-key"], key: SERVER_KEY}}; 
        
    //     } 
        
    // } else if ((event["headers"]["X-Server-Key"]) != null) {
        
    //     if((event["headers"]["X-Server-Key"]) != SERVER_KEY) {
            
    //         return {statusCode: 401, body: {result: false, error: "Unauthorized request!", headers: event["headers"]["X-Server-Key"], key: SERVER_KEY}}; 
        
    //     } 
        
    // }
        
    const userId = "1234";
    
    var tablename = null;
    var expression = null;
    var expressionAttributeNames = null;
    var expressionAttributeValues = null;
    
    try {
        tablename = JSON.parse(event.body).tablename.trim();
        expression = JSON.parse(event.body).expression;
        expressionAttributeValues = JSON.parse(event.body).expressionAttributeValues;
        expressionAttributeNames = JSON.parse(event.body).expressionAttributeNames;
    } catch (e) {
        const response = {statusCode: 400, body: { result: false, error: "Malformed body! Error in parsing"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(tablename == null || tablename == "" || tablename.length < 3) {
        const response = {statusCode: 400, body: {result: false, error: "TableName is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }

    if(expression == null || expressionAttributeNames == null || expressionAttributeValues == null) {
        const response = {statusCode: 400, body: {result: false, error: "Expressions are not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var queryParams = {
        KeyConditionExpression: expression,
        ExpressionAttributeValues: JSON.parse(expressionAttributeValues),
        ExpressionAttributeNames:  JSON.parse(expressionAttributeNames),
        TableName: tablename
    };
    
    // console.log(queryParams);
    
    const arrQueryResult = [];
    const ddbQuerySerial = async (queryParams, exclusiveStartKey = null) => {
        try {
            if(exclusiveStartKey != null) {
                queryParams['ExclusiveStartKey'] = exclusiveStartKey;
            }
            const data = await ddbClient.send(new QueryCommand(queryParams));
            for(var m = 0; m < data.Items.length; m++) {
                arrQueryResult.push(data.Items[m])
            }
            if(data.LastEvaluatedKey != null) {
                await ddbQuerySerial(queryParams, data.LastEvaluatedKey);
            }
            return;
        } catch (err) {
            sleep(2000)
            console.log(err);
            await ddbQuerySerial(queryParams, exclusiveStartKey);
            return err;
        }
    };
    await ddbQuerySerial(queryParams);

    const response = {statusCode: 200, body: {result: arrQueryResult}};
    // const response = {statusCode: 200, body: {result: true}};
    return response;
    
    
}