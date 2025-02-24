// getunmappedevents (projectid)

import { ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';

export const processGetUnmappedEvents = async (event) => {
    
    console.log('getting unmapped');
    
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
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        role = JSON.parse(event.body).role.trim();
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
    
    if(role == null || role == "" || role.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Mode is not valid!"}}
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
    
    var unmarshalledItem = {};
    for(var i = 0; i < Object.keys(resultGet.Item).length; i++) {
        unmarshalledItem[Object.keys(resultGet.Item)[i]] = resultGet.Item[Object.keys(resultGet.Item)[i]][Object.keys(resultGet.Item[Object.keys(resultGet.Item)[i]])[0]];
    }
    
    //console.log(JSON.parse(unmarshalledItem.events));
    
    const compliances = [];
    const complianceIds = [];
    
    const events = JSON.parse(unmarshalledItem.events);
    for(i = 0; i < Object.keys(events).length; i++) {
        for(var j = 0; j < events[Object.keys(events)[i]].length; j++) {
            if(!complianceIds.includes(events[Object.keys(events)[i]][j].id)) {
                complianceIds.push(events[Object.keys(events)[i]][j].id);
                compliances.push(events[Object.keys(events)[i]][j]);
            }
        }
    }
    
    var mappings = null;
    if(role == ROLE_REPORTER) {
        if(unmarshalledItem.mappingreporter != null) {
            mappings = JSON.parse(unmarshalledItem.mappingreporter);
        }
    }
    
    if(role == ROLE_APPROVER) {
        if(unmarshalledItem.mappingapprover != null) {
            mappings = JSON.parse(unmarshalledItem.mappingapprover);
        }
    }
    
    // const mappedCompliances = [];
    // const mappedComplianceIds = [];
    
    // const unmappedCompliances = [];
    // const unmappedComplianceIds = [];
    
    // for(var i = 0; i < complianceIds.length; i++) {
        
    //     if(role == ROLE_REPORTER) {
            
    //         if(unmarshalledItem.reportermappings != null) {
                
    //             if(unmarshalledItem.reportermappings[complianceIds[i]] != null) {
    //                 mappedCompliances.push(compliances[i]);
    //                 mappedComplianceIds.push(complianceIds[i])
    //             } else {
    //                 unmappedCompliances.push(compliances[i]);
    //                 unmappedComplianceIds.push(complianceIds[i])
    //             }
                
    //         } else {
                
    //             unmappedCompliances.push(compliances[i]);
    //             unmappedComplianceIds.push(complianceIds[i])
                
    //         }
            
    //     }
        
    //     if(role == ROLE_APPROVER) {
            
    //         if(unmarshalledItem.approvermappings != null) {
                
    //             if(unmarshalledItem.approvermappings[complianceIds[i]] != null) {
    //                 mappedCompliances.push(compliances[i]);
    //                 mappedComplianceIds.push(complianceIds[i])
    //             } else {
    //                 unmappedCompliances.push(compliances[i]);
    //                 unmappedComplianceIds.push(complianceIds[i])
    //             }
                
    //         } else {
                
    //             unmappedCompliances.push(compliances[i]);
    //             unmappedComplianceIds.push(complianceIds[i])
                
    //         }
            
    //     }
        
    // }
    
    const response = {statusCode: 200, body: {result: true, data: {unmappedEvents: compliances, mappings: mappings}}};
    return response;
    

}