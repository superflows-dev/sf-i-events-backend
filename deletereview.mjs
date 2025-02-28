// synccalendar (projectid, events)


import { s3Client, GetObjectCommand, PutObjectCommand, BUCKET_NAME, BUCKET_FOLDER_REPORTING } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAddLog } from './addlog.mjs';
import { Buffer } from 'buffer'

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
        console.log(e);
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
    
    // const ddbPut = async (setParams) => {
    //     try {
    //       const data = await ddbClient.send(new PutItemCommand(setParams));
    //       return data;
    //     } catch (err) {
    //       return err;
    //     }
    // };
    
    // const ddbDelete = async (queryParams) => {
    //     try {
    //         const data = await ddbClient.send(new DeleteItemCommand(queryParams));
    //         return data;
    //     } catch (err) {
    //         return err;
    //     }
    // };
    
    // const deleteParams = {
    //     TableName: TABLE_R,
    //     Key: {
    //       projectid: { S: projectid },
    //       sortid: { S: mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid}
    //     },
    // };
    // var resultDelete = await ddbDelete(deleteParams);
    
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
    let mm = mmddyyyy.split('/')[0]
    let sortid = mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid;
    let assReports = {};
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
    });
    
    let responseS3;
    try {
        responseS3 = await s3Client.send(command);
        const s3ResponseStream = responseS3.Body;
        const chunks = [];
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk);
        }
        const responseBuffer = Buffer.concat(chunks);
        const jsonContent = JSON.parse(responseBuffer.toString());
        assReports = jsonContent;
        
    } catch (err) {
      console.error(err); 
    }
    delete assReports[sortid];
    let putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
        Body: JSON.stringify(assReports),
        ContentType: 'application/json'
    })
    
    try {
        await s3Client.send(putCommand);
    } catch (err) {
      console.log('putCommand err', err); 
    }
    let assReportsMonthly = {};
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
    });
    
    try {
        responseS3 = await s3Client.send(command);
        const s3ResponseStream = responseS3.Body;
        const chunks = [];
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk);
        }
        const responseBuffer = Buffer.concat(chunks);
        const jsonContent = JSON.parse(responseBuffer.toString());
        assReportsMonthly = jsonContent;
        
    } catch (err) {
      console.error(err); 
    }
    delete assReportsMonthly[sortid]
    putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
        Body: JSON.stringify(assReportsMonthly),
        ContentType: 'application/json'
    })
    
    try {
        await s3Client.send(putCommand);
    } catch (err) {
      console.log('putCommand err', err); 
    }
    const response = {statusCode: 200, body: {result: true}};
    processAddLog(userId, 'deletereview', event, response, response.statusCode)
    return response;

}