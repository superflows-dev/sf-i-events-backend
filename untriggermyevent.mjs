// mapevent (events[], users[])


import { ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, FINCAL_START_MONTH, TABLE_T, TABLE_CAL, TABLE_C, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, UpdateItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, TIMEFRAME_BEFORE, TIMEFRAME_AFTER } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';

export const processUnTriggerMyEvent = async (event) => {
    
    console.log('untriggermyevent');
    
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
    var entityid = null;
    var locationid = null;
    var mmdd = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        eventid = JSON.parse(event.body).eventid.trim();
        entityid = JSON.parse(event.body).entityid.trim();
        locationid = JSON.parse(event.body).locationid.trim();
        mmdd = JSON.parse(event.body).mmdd.trim();
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
    
    if(eventid == null || eventid == "" || eventid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Event Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(entityid == null || entityid == "" || entityid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Entity Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(locationid == null || locationid == "" || locationid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Location Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(mmdd == null || mmdd == "" || mmdd.length <= 0) {
        const response = {statusCode: 400, body: {result: false, error: "Mmdd is not valid!"}}
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
    
    async function ddbGet (getParams) {
        try {
          const data = await ddbClient.send(new GetItemCommand(getParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    const currYear = new Date().getFullYear();
    
    function getFincalFromMonth(mm) {
        
        if(parseInt(mm) >= FINCAL_START_MONTH && parseInt(mm) <= 12) {
            return parseInt(currYear);
        } else {
            return (parseInt(currYear) + 1);
        }
        
    }
    
    var getParams = {
        TableName: TABLE_T,
        Key: {
          projectid: { S: projectid },
          sortid: { S: entityid + ';' + locationid + ';' + eventid },
        },
    };
    var resultGet = await ddbGet(getParams);
    
    if(resultGet.Item == null) {
        const response = {statusCode: 404, body: {result: false, error: "Trigger record does not exist!"}}
        processAddLog(userId, 'triggerevent', event, response, response.statusCode)
        return response;
    }
    
    var jsonData = JSON.parse(resultGet.Item.data.S);
    
    var arrData = [];
    
    for(var i = 0; i < jsonData.length; i++) {
        if(jsonData[i].newduedate != mmdd) {
            arrData.push(jsonData[i]);
        }
    }
    
    var item = {
        projectid: { S: projectid },
        sortid: { S: entityid + ';' + locationid + ';' + eventid },
        data: {"S": JSON.stringify(arrData)}
    };
    
    var setParams = {
        TableName: TABLE_T,
        Item: item
    };
    
    var resultPut = await ddbPut(setParams);
    
    getParams = {
        TableName: TABLE_CAL,
        Key: {
          projectid: { S: projectid },
          sortid: { S: mmdd + "/" + getFincalFromMonth(mmdd.split('/')[0]) + ';' + entityid + ';' + locationid },
        },
    };
    
    resultGet = await ddbGet(getParams);
    
    jsonData = JSON.parse(resultGet.Item.data.S);
    
    arrData = [];
    
    for(var i = 0; i < jsonData.length; i++) {
        if(jsonData[i].id != eventid) {
            arrData.push(jsonData[i])
        }
    }
    
    item = {
        projectid: { S: projectid },
        sortid: { S: mmdd + "/" + getFincalFromMonth(mmdd.split('/')[0]) + ';' + entityid + ';' + locationid },
        data: {"S": JSON.stringify(arrData)}
    };
    
    setParams = {
        TableName: TABLE_CAL,
        Item: item
    };
    
    resultPut = await ddbPut(setParams);

    const response = {statusCode: 200, body: {result: {item: item, resultput: resultPut}}};
    processAddLog(userId, 'triggerevent', event, response, response.statusCode)
    return response;

}