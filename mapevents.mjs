// mapevent (events[], users[])


import { ROLE_APPROVER, ROLE_REPORTER, TABLE, ddbClient, GetItemCommand, UpdateItemCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAddLog } from './addlog.mjs';
import { Buffer } from 'buffer'
export const processMapEvents = async (event) => {
    
    console.log('mapevents');
    
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
    var role = null;
    var mapping = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        role = JSON.parse(event.body).role.trim();
        mapping = JSON.parse(event.body).mapping.trim();
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(role == null || role == "" || role.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Role is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(mapping == null || mapping == "" || mapping.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Mapping is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(role != ROLE_APPROVER && role != ROLE_REPORTER) {
        const response = {statusCode: 400, body: {result: false, error: "Role is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var getParams = {
        TableName: TABLE,
        Key: {
          projectid: { S: projectid },
        },
    };
    
    async function ddbGet () {
        try {
          const data = await ddbClient.send(new GetItemCommand(getParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    var resultGet = await ddbGet();
    
    if(resultGet.Item == null) {
        const response = {statusCode: 404, body: {result: false, error: "Record does not exist!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(role == ROLE_REPORTER) {
        
        var updateParams = {
            TableName: TABLE,
            Key: {
              projectid: { S: projectid },
            },
            UpdateExpression: "set #mappingreporter1 = :mappingreporter1",
            ExpressionAttributeValues: {
                ":mappingreporter1": {"S": mapping}
            },
            ExpressionAttributeNames:  {
                "#mappingreporter1": "mappingreporter"
            }
        };
        
        const ddbUpdate = async () => {
            try {
                const data = await ddbClient.send(new UpdateItemCommand(updateParams));
                return data;
            } catch (err) {
                return err;
            }
        };
      
        await ddbUpdate();
        
        const response = {statusCode: 200, body: {result: true}};
        processAddLog(userId, 'mapevents', event, response, response.statusCode)
        return response;
        
    } else {
        
        var updateParams1 = {
            TableName: TABLE,
            Key: {
              projectid: { S: projectid },
            },
            UpdateExpression: "set #mappingapprover1 = :mappingapprover1",
            ExpressionAttributeValues: {
                ":mappingapprover1": {"S": mapping}
            },
            ExpressionAttributeNames:  {
                "#mappingapprover1": "mappingapprover"
            }
        };
        
        const ddbUpdate = async () => {
            try {
                const data = await ddbClient.send(new UpdateItemCommand(updateParams1));
                return data;
            } catch (err) {
                return err;
            }
        };
      
        await ddbUpdate();
        
        const response = {statusCode: 200, body: {result: true}};
        processAddLog(userId, 'mapevents', event, response, response.statusCode)
        return response;
        
    }
    
    

}