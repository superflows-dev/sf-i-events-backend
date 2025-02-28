// getuserevents (projectid, userprofileid)


import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ROLE_REPORTER, ROLE_APPROVER, TABLE,ddbClient, GetItemCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { Buffer } from 'buffer'

export const processGetUserEvents = async (event) => {
    
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
    
    
    var projectid = null;
    var userprofileid = null;
    var role = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        userprofileid = JSON.parse(event.body).userprofileid.trim();
        role = JSON.parse(event.body).role.trim();
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
    
    if(userprofileid == null || userprofileid == "" || userprofileid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "User profile id is not valid!"}}
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
    }
    
    var resultGet = await ddbGet();
    
    if(resultGet.Item == null) {
        const response = {statusCode: 404, body: {result: false, error: "Record does not exist!"}};
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var unmarshalledItem = {};
    for(var i = 0; i < Object.keys(resultGet.Item).length; i++) {
        unmarshalledItem[Object.keys(resultGet.Item)[i]] = resultGet.Item[Object.keys(resultGet.Item)[i]][Object.keys(resultGet.Item[Object.keys(resultGet.Item)[i]])[0]];
    }
    
    
    var mappingsReporter = null;
    if(unmarshalledItem.mappingreporter != null) {
        mappingsReporter = JSON.parse(unmarshalledItem.mappingreporter);
    }
    
    var mappingsApprover = null;
    if(unmarshalledItem.mappingapprover != null) {
        mappingsApprover = JSON.parse(unmarshalledItem.mappingapprover);
    }
    
    var documents = null;
    console.log(unmarshalledItem);
    if(unmarshalledItem.docs != null) {
        documents = JSON.parse(unmarshalledItem.docs);
    }
    
    var comments = null;
    if(unmarshalledItem.comments != null) {
        comments = JSON.parse(unmarshalledItem.comments);
    }
    
    var approved = null;
    if(unmarshalledItem.approved != null) {
        approved = JSON.parse(unmarshalledItem.approved);
    }
    
    var lastupdated = null;
    if(unmarshalledItem.lastupdated != null) {
        lastupdated = JSON.parse(unmarshalledItem.lastupdated);
    }
    
    var dateofcompletion = null;
    if(unmarshalledItem.dateofcompletion != null) {
        dateofcompletion = JSON.parse(unmarshalledItem.dateofcompletion);
    }
    
    const events = JSON.parse(unmarshalledItem.events);
    const mappedEvents = {};
    
    if(role == ROLE_REPORTER) {
        for(i = 0; i < Object.keys(events).length; i++) {
            const key = Object.keys(events)[i];
            for(var j = 0; j < events[key].length; j++) {
                const eventId = events[Object.keys(events)[i]][j].id;
                var found = false;
                if(mappingsReporter.users[eventId] != null) {
                    for(var k = 0; k < mappingsReporter.users[eventId].length; k++) {
                        if(mappingsReporter.users[eventId][k].indexOf(userprofileid) >= 0) {
                            found = true;
                            break;
                        }
                    }
                }
                
                if(found) {
                    if(mappedEvents[key] == null) {
                       mappedEvents[key] = []; 
                    }
                    if(mappingsReporter == null || mappingsReporter.tags == null || mappingsReporter.tags[eventId] == null) {
                        events[Object.keys(events)[i]][j]['tags'] = "[]";
                    } else {
                        events[Object.keys(events)[i]][j]['tags'] = mappingsReporter.tags[eventId];
                    }
                    if(documents == null || documents[eventId] == null) {
                        events[Object.keys(events)[i]][j]['documents'] = "[]";
                    } else {
                        events[Object.keys(events)[i]][j]['documents'] = documents[eventId];
                    }
                    if(comments == null || comments[eventId] == null) {
                        events[Object.keys(events)[i]][j]['comments'] = "";
                    } else {
                        events[Object.keys(events)[i]][j]['comments'] = comments[eventId];
                    }
                    if(approved == null || approved[eventId] == null) {
                        events[Object.keys(events)[i]][j]['approved'] = false;
                    } else {
                        events[Object.keys(events)[i]][j]['approved'] = approved[eventId];
                    }
                    if(lastupdated == null || lastupdated[eventId] == null) {
                        events[Object.keys(events)[i]][j]['lastupdated'] = -1;
                    } else {
                        events[Object.keys(events)[i]][j]['lastupdated'] = lastupdated[eventId];
                    }
                    if(dateofcompletion == null || dateofcompletion[eventId] == null) {
                        events[Object.keys(events)[i]][j]['dateofcompletion'] = "";
                    } else {
                        events[Object.keys(events)[i]][j]['dateofcompletion'] = dateofcompletion[eventId];
                    }
                    mappedEvents[key].push(events[Object.keys(events)[i]][j]);
                }
            }
        }
    }
    
    if(role == ROLE_APPROVER) {
        for(i = 0; i < Object.keys(events).length; i++) {
            const key = Object.keys(events)[i];
            for(j = 0; j < events[key].length; j++) {
                const event = events[Object.keys(events)[i]][j];
                const eventId = events[Object.keys(events)[i]][j].id;
                found = false;
                if(mappingsApprover.users[eventId] != null) {
                    for(k = 0; k < mappingsApprover.users[eventId].length; k++) {
                        if(mappingsApprover.users[eventId][k].indexOf(userprofileid) >= 0) {
                            found = true;
                            break;
                        }
                    }
                }
                
                if(found) {
                    if(mappedEvents[key] == null) {
                       mappedEvents[key] = []; 
                    }
                    // if(documents == null || documents[eventId] == null) {
                    //     event['documents'] = "[]";
                    // } else {
                    //     event['documents'] = documents;
                    // }
                    // if(reportercomments == null || reportercomments[eventId] == null) {
                    //     event['reportercomments'] = "";
                    // } else {
                    //     event['reportercomments'] = reportercomments;
                    // }
                    // if(approvercomments == null || approvercomments[eventId] == null) {
                    //     event['approvercomments'] = "";
                    // } else {
                    //     event['approvercomments'] = approvercomments;
                    // }
                    // if(approved == null || approved[eventId] == null) {
                    //     event['approved'] = false;
                    // } else {
                    //     event['approved'] = approved;
                    // }
                    // if(lastupdated == null || lastupdated[eventId] == null) {
                    //     event['lastupdated'] = -1;
                    // } else {
                    //     event['lastupdated'] = lastupdated;
                    // }
                    if(documents == null || documents[eventId] == null) {
                        events[Object.keys(events)[i]][j]['documents'] = "[]";
                    } else {
                        events[Object.keys(events)[i]][j]['documents'] = documents[eventId];
                    }
                    if(comments == null || comments[eventId] == null) {
                        events[Object.keys(events)[i]][j]['comments'] = "";
                    } else {
                        events[Object.keys(events)[i]][j]['comments'] = comments[eventId];
                    }
                    if(approved == null || approved[eventId] == null) {
                        events[Object.keys(events)[i]][j]['approved'] = false;
                    } else {
                        events[Object.keys(events)[i]][j]['approved'] = approved[eventId];
                    }
                    if(lastupdated == null || lastupdated[eventId] == null) {
                        events[Object.keys(events)[i]][j]['lastupdated'] = -1;
                    } else {
                        events[Object.keys(events)[i]][j]['lastupdated'] = lastupdated[eventId];
                    }
                    if(dateofcompletion == null || dateofcompletion[eventId] == null) {
                        events[Object.keys(events)[i]][j]['dateofcompletion'] = -1;
                    } else {
                        events[Object.keys(events)[i]][j]['dateofcompletion'] = dateofcompletion[eventId];
                    }
                    mappedEvents[key].push(event);
                }
            }
        }
        
    }
    
    const response = {statusCode: 200, body: {result: true, data: {events: mappedEvents}}};
    return response;
    
}