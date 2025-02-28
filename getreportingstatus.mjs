// getuserevents (projectid, userprofileid)


import { TABLE_R, ddbClient, QueryCommand, SERVER_KEY } from "./globals.mjs";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const processGetReportingStatus = async (event) => {
    
    // if((event["headers"]["Authorization"]) == null) {
    //     return {statusCode: 400, body: { result: false, error: "Malformed headers!"}};
    // }
    
    // if((event["headers"]["Authorization"].split(" ")[1]) == null) {
    //     return {statusCode: 400, body: { result: false, error: "Malformed headers!"}};
    // }
    
    // var hAscii = Buffer.from((event["headers"]["Authorization"].split(" ")[1] + ""), 'base64').toString('ascii');
    
    // if(hAscii.split(":")[1] == null) {
    //     return {statusCode: 400, body: { result: false, error: "Malformed headers!"}};
    // }
    
    // const email = hAscii.split(":")[0];
    // const accessToken = hAscii.split(":")[1];
    
    // if(email == "" || !email.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)) {
    //     return {statusCode: 400, body: {result: false, error: "Malformed headers!"}}
    // }
    
    // if(accessToken.length < 5) {
    //     return {statusCode: 400, body: {result: false, error: "Malformed headers!"}}
    // }
    
    // const authResult = await processAuthenticate(event["headers"]["Authorization"]);
    
    // if(!authResult.result) {
    //     return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    // }
    
    // if(ADMIN_METHODS.includes("detail")) {
    //     if(!authResult.admin) {
    //         return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    //     }   
    // }
    
    // const userId = authResult.userId;
    
    if((event["headers"]["x-server-key"]) == SERVER_KEY) {
        return {statusCode: 400, body: { result: false, error: "Malformed headers!"}};
    }
    
    // const userId = "1234";
    
    var projectid = null;
    var entityid = null;
    var locationid = null;
    var mmddyyyy = null;
    var eventid = null;

    try {
        projectid = JSON.parse(event.body).projectid.trim();
        entityid = JSON.parse(event.body).entityid.trim();
        locationid = JSON.parse(event.body).locationid.trim();
        mmddyyyy = JSON.parse(event.body).mmddyyyy.trim();
        eventid = JSON.parse(event.body).eventid.trim();
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
    
    if(entityid == null || entityid == "" || entityid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Entity id is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(locationid == null || locationid == "" || locationid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Location id is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(mmddyyyy == null || mmddyyyy == "" || mmddyyyy.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Mmddyyyy is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(eventid == null || eventid == "" || eventid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Event id is not valid!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    // var getParams = {
    //     TableName: TABLE,
    //     Key: {
    //       projectid: { S: projectid },
    //     },
    // };
    
    
    // async function ddbGet (getParams) {
    //     try {
    //       const data = await ddbClient.send(new GetItemCommand(getParams));
    //       return data;
    //     } catch (err) {
    //       return err;
    //     }
    // };
    
    var queryParams = {
        KeyConditionExpression: "#projectid1 = :projectid1",
        ExpressionAttributeValues: {
          ":projectid1": { S: projectid }
        },
        ExpressionAttributeNames:  {
            "#projectid1": "projectid"
        },
        TableName: TABLE_R
    };
    
    const arrSerial = [];
    const ddbQuerySerial = async (queryParams, exclusiveStartKey = null) => {
        try {
            if(exclusiveStartKey != null) {
                queryParams['ExclusiveStartKey'] = exclusiveStartKey;
            }
            const data = await ddbClient.send(new QueryCommand(queryParams));
            for(var m = 0; m < data.Items.length; m++) {
                arrSerial.push(data.Items[m])
            }
            if(data.LastEvaluatedKey != null) {
                await ddbQuerySerial(queryParams, data.LastEvaluatedKey);
            }
            return;
        } catch (err) {
            console.log('inside scan', err);
            await sleep(2000);
            ddbQuerySerial(queryParams, exclusiveStartKey);
            //return err;
        }
    };
    await ddbQuerySerial(queryParams);
    
    for(var i = 0; i < arrSerial.length; i++) {
        
        const report = arrSerial[i];
        const sortid = report.sortid.S;
        const arrSortid = sortid.split(";");
        const dbMmddyy = arrSortid[0];
        const dbEntityId = arrSortid[1];
        const dbLocationId = arrSortid[2];
        const dbEventId = arrSortid[3];
        
        //console.log(dbMmddyy, mmddyyyy, dbEntityId, entityid, dbLocationId, locationid, dbEventId, eventid);
        
        if(dbMmddyy == mmddyyyy && dbEntityId == entityid && dbLocationId == locationid && dbEventId == eventid) {
            const reportJson = JSON.parse(report.data.S);
            // const docs = JSON.parse(reportJson.docs);
            const comments = reportJson.comments;
            const lastupdated = reportJson.lastupdated;
            console.log(reportJson.approved);
            const approved = reportJson.approved == null ? false : reportJson.approved === false ? false : true;
            var status = -1;
            if(approved) {
                status = 2;
            } else if(comments.length === 0) {
                status = 0;
            } else {
                status = 1;
            }
            const response = {statusCode: 200, body: {result: true, data: {status: status, lastupdated: lastupdated}}};
            return response;
        }
        
    }
    
    const response = {statusCode: 200, body: {result: false, error: "Not found!"}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
    return response;
    
}