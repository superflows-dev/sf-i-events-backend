// getuserevents (projectid, userprofileid)


import { TABLE_RCM_NOTIF, ddbClient, GetItemCommand, UpdateItemCommand, SERVER_KEY } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { Buffer } from 'buffer'


export const processGetRcmNotifications = async (event) => {
    
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
        
    
    }
    
    // const userId = "1234";
    
    var projectid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
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
    
    var getParams = {
        TableName: TABLE_RCM_NOTIF,
        Key: {
          projectid: { S: projectid },
        },
    };
    
    const data = await ddbClient.send(new GetItemCommand(getParams));
    
    var notif = [];
    
    if(data.Item) {
        
        notif = JSON.parse(data.Item.data.S);
        
    }
    
    console.log('notif', notif);
    
    const lastWeek = new Date().getTime() - 45*24*60*60*1000;
    
    var newNotif = [];
    
    for(var i = 0; i < notif.length; i++) {
        
        console.log('comparing', parseInt(notif[i].timestamp*1000 + ""), lastWeek);
        
        if(parseInt(notif[i].timestamp*1000 + "") >= lastWeek) {
            newNotif.push(notif[i]);
        }
        
    }
    
    var setParams = {
        TableName: TABLE_RCM_NOTIF,
        Key: {
            projectid: {
                "S": projectid
            }
        },
        UpdateExpression: "set #data1 = :data1",
        ExpressionAttributeNames: {
            "#data1": "data"
        },
        ExpressionAttributeValues: {
            ":data1": {"S": JSON.stringify(newNotif)},
        },
    };
    
    console.log(setParams);
    
    const ddbUpdate = async (setParams) => {
        try {
          const data = await ddbClient.send(new UpdateItemCommand(setParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    await ddbUpdate(setParams);
    
    
    const response = {statusCode: 200, body: {result: true, data: newNotif}};
    return response;
    
}