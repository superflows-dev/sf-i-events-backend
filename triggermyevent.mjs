// mapevent (events[], users[])


import { processAuthenticate } from './authenticate.mjs';
import { processNotifyChange } from './notifychange.mjs';
import { Buffer } from "buffer";
export const processTriggerMyEvent = async (event) => {
    
    console.log('triggerevent');
    
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
    
    console.log(email, accessToken);
    
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
    
    
    // const userId = "1234";
    
    var projectid = null;
    var complianceid = null;
    var message = null;
    var userid = null;
    var username = null;
    var countryname = null;
    var entityname = null;
    var locationname = null;
    var statute = null;
    var subcategory = null;
    
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        complianceid = JSON.parse(event.body).complianceid.trim();
        message = JSON.parse(event.body).message.trim();
        userid = JSON.parse(event.body).userid.trim();
        username = JSON.parse(event.body).username.trim();
        countryname = JSON.parse(event.body).countryname.trim();
        entityname = JSON.parse(event.body).entityname.trim();
        locationname = JSON.parse(event.body).locationname.trim();
        statute = JSON.parse(event.body).statute.trim();
        subcategory = JSON.parse(event.body).subcategory.trim();
    } catch (e) {
        console.log('error',e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(complianceid == null || complianceid == "" || complianceid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Compliance Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(message == null || message == "") {
        const response = {statusCode: 400, body: {result: false, error: "Message is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(userid == null || userid == "") {
        const response = {statusCode: 400, body: {result: false, error: "UserId is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(username == null || username == "") {
        const response = {statusCode: 400, body: {result: false, error: "Username is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(countryname == null || countryname == "") {
        const response = {statusCode: 400, body: {result: false, error: "Countryname is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(entityname == null || entityname == "") {
        const response = {statusCode: 400, body: {result: false, error: "Entityname is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(locationname == null || locationname == "") {
        const response = {statusCode: 400, body: {result: false, error: "Locationname is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(statute == null || statute == "") {
        const response = {statusCode: 400, body: {result: false, error: "Statute is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(subcategory == null || subcategory == "") {
        const response = {statusCode: 400, body: {result: false, error: "Subcategory is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    // const data = { 
    //   projectid: projectid, 
    //   complianceid: complianceid,
    //   message: message,
    //   userid: userid,
    //   username: username
    // }
    
    const notifyChange = await processNotifyChange(event["headers"]["Authorization"], JSON.parse(event.body), '/actionregisterfeedback');
    
    const response = {statusCode: 200, body: {result: true, notifyChange: notifyChange}};
    // processAddLog(userId, 'triggerevent', event, response, response.statusCode)
    return response;

}