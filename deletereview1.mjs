// synccalendar (projectid, events)


import { UPLOAD_TYPE_REVIEW, UPLOAD_TYPE_REPORT, REGION, TABLE, TABLE_R, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, UpdateItemCommand, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, DeleteItemCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';

export const processDeleteReview = async (event) => {
    
    console.log('processing upload', event.body);
    
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
    
    const userId = authResult.userId;
    
    // const userId = "1234";
    
    var projectid = null;
    var eventid = null;
    var mmddyyyy = null;
    var entityid = null;
    var locationid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        console.log(projectid);
        entityid = JSON.parse(event.body).entityid.trim();
        console.log(entityid);
        locationid = JSON.parse(event.body).locationid.trim();
        console.log(locationid);
        eventid = JSON.parse(event.body).eventid.trim();
        console.log(eventid);
        mmddyyyy = JSON.parse(event.body).mmddyyyy;
        console.log(mmddyyyy);
    } catch (e) {
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        processAddLog(userId, 'deletereview', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}};
        processAddLog(userId, 'deletereview', event, response, response.statusCode)
        return response;
    }
    
    if(entityid == null || entityid == "" || entityid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Entity Id is not valid!"}};
        processAddLog(userId, 'deletereview', event, response, response.statusCode)
        return response;
    }
    
    if(locationid == null || locationid == "" || locationid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Location Id is not valid!"}};
        processAddLog(userId, 'deletereview', event, response, response.statusCode)
        return response;
    }
    
    if(eventid == null || eventid == "" || eventid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Event Id is not valid!"}};
        processAddLog(userId, 'deletereview', event, response, response.statusCode)
        return response;
    }
    
    if(mmddyyyy == null || mmddyyyy == "" || mmddyyyy.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "mmddyyyy is not valid!"}};
        processAddLog(userId, 'deletereview', event, response, response.statusCode)
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
    
    const ddbDelete = async (queryParams) => {
        try {
            const data = await ddbClient.send(new DeleteItemCommand(queryParams));
            return data;
        } catch (err) {
            return err;
        }
    };
    
    const deleteParams = {
        TableName: TABLE_R,
        Key: {
          projectid: { S: projectid },
          sortid: { S: mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid}
        },
    };
    var resultDelete = await ddbDelete(deleteParams);
    
    // async function ddbGet (getParams) {
    //     try {
    //       const data = await ddbClient.send(new GetItemCommand(getParams));
    //       return data;
    //     } catch (err) {
    //       return err;
    //     }
    // }
    
    // var getParams = {
    //     TableName: TABLE_R,
    //     Key: {
    //       projectid: { S: projectid },
    //       sortid: { S: mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid}
    //     },
    // };
    
    // var resultGet = await ddbGet(getParams);
    
    // var data = JSON.parse(resultGet.Item.data.S);
    
    // var dbComments = [];
    
    // if(resultGet.Item != null) {
        
    //     dbComments = JSON.parse(resultGet.Item.data.S).comments;
    //     dbComments.splice(-1);
        
    //     data.comments = dbComments;
    //     data.lastupdated = (new Date()).toUTCString();
    //     data.approved = resultGet.Item.approved;
        
    //     var item = {
    //         projectid: {"S": projectid},
    //         sortid: { S: mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid},
    //         data: {"S": JSON.stringify(data)}
    //     };
        
    //     var setParams = {
    //         TableName: TABLE_R,
    //         Item: item
    //     };
        
    //     const resultPut = await ddbPut(setParams);
        
    // }
    
    const response = {statusCode: 200, body: {result: resultDelete}};
    processAddLog(userId, 'deletereview', event, response, response.statusCode)
    return response;

}