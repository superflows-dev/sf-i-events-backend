// getunmappedevents (projectid)

import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, TABLE_SIGNOFF, ddbClient, GetItemCommand, PutItemCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { Buffer } from 'buffer';
export const processUpdateSignoff = async (event) => {
    
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
    

    var projectid = null;
    var signofftext = null;
    var signature = null;
    var username = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        signofftext = JSON.parse(event.body).signofftext.trim();
        signature = JSON.parse(event.body).signature.trim();
        username = JSON.parse(event.body).username.trim();
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Projectid is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(signofftext == null || signofftext == "" || signofftext.length < 2) {
        const response = {statusCode: 400, body: {result: false, error: "Signofftext is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(signature == null || signature == "" || signature.length < 2) {
        const response = {statusCode: 400, body: {result: false, error: "Signature is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(username == null || username == "" || username.length < 2) {
        const response = {statusCode: 400, body: {result: false, error: "Username is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    async function ddbGet (getParams) {
        try {
          const data = await ddbClient.send(new GetItemCommand(getParams));
          return data;
        } catch (err) {
          return err;
        }
    }
    
    var getParams = {
        TableName: TABLE_SIGNOFF,
        Key: {
          projectid: { S: projectid }
        },
    };
    
    var resultGet = await ddbGet(getParams);
    
    const arrSignoffs = [];
    
    if(resultGet.Item != null) {
        
        if(resultGet.Item.data != null) {
            const arrData = JSON.parse(resultGet.Item.data.S);
            arrSignoffs.push(...arrData);    
        }
        
        
    }
    
    const ts = new Date().getTime();
    
    const newSignoff = {
        projectid: projectid,
        signofftext: signofftext,
        signature: signature,
        timestamp: ts,
        username: username
    };
    
    arrSignoffs.push(newSignoff);
    
    const ddbPut = async (setParams) => {
        try {
          const data = await ddbClient.send(new PutItemCommand(setParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    const item = {
        projectid: {"S": projectid},
        data: {"S": JSON.stringify(arrSignoffs)}
    };
    
    
    const setParams = {
        TableName: TABLE_SIGNOFF,
        Item: item
    };
    
    var resultPut = await ddbPut(setParams);
    
    const response = {statusCode: 200, body: {result: resultPut}};
    return response;
    

}