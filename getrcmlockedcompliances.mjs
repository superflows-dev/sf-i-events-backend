// getuserevents (projectid, userprofileid)


import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, TABLE_RCM_LOCKS, ddbClient, GetItemCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { Buffer } from 'buffer';

export const processGetRcmLockedCompliances = async (event) => {
    
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
    
    
    // const userId = "1234";
    
    var data = null;
    
    try {
        data = JSON.parse(event.body).data;
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(data == null) {
        const response = {statusCode: 400, body: {result: false, error: "Data is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    const resArr = [];
    
    for(var i = 0; i < data.length; i++) {
        
        var getParams = {
            TableName: TABLE_RCM_LOCKS,
            Key: {
              complianceid: { S: data[i] },
            },
        };
        
        const item = await ddbClient.send(new GetItemCommand(getParams));
        console.log(item);
        if(item.Item) {
            resArr.push(item.Item);
        }
        
    }
    
    const response = {statusCode: 200, body: {result: true, data: resArr}};
    return response;
    
}