// getunmappedevents (projectid)

import { ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand, QueryCommand, ADMIN_METHODS, FINCAL_START_MONTH, UpdateItemCommand, SERVER_KEY } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import * as https from 'https';
import { processSfIEventsAddToQueue } from './addtoqueue.mjs'

export const processDdbPut = async (event) => {
    
    console.log('getting mapped calendar');
    
    if((event["headers"]["x-server-key"]) == SERVER_KEY) {
        return {statusCode: 400, body: { result: false, error: "Malformed headers!"}};
    }
    
    const userId = "1234";
    
    var tablename = null;
    var item = null;
    
    try {
        tablename = JSON.parse(event.body).tablename.trim();
        item = JSON.parse(event.body).item;
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

    if(item == null) {
        const response = {statusCode: 400, body: {result: false, error: "Item is not valid!"}}
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
    
    var setParams = {
        TableName: tablename,
        Item: (item)
    };
    
    var resultPut = await ddbPut(setParams);
    // // console.log(setParams);

    const response = {statusCode: 200, body: {result: resultPut}};
    // const response = {statusCode: 200, body: {result: true}};
    return response;
    
    
}