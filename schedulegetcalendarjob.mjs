import { CHANGE_MANAGEMENT_START_CALENDAR_PATH } from './globals.mjs'
import { processAuthenticate } from './authenticate.mjs'
import { processNotifyChangeCalendar } from './notifychangecalendar.mjs'
import { processAddLog } from './addlog.mjs'
import { Buffer } from 'buffer'
export const processScheduleGetCalendarJob = async (event) => {
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
    const userId = authResult.userId;
    
    var projectid = null;
    var year = null;
    var contractstartdate = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        year = JSON.parse(event.body).year;
        contractstartdate = JSON.parse(event.body).contractstartdate;
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
    
    if(year == null) {
        
        year = getCurrentFiscal() + "";
        
    }

    let body = {
      projectid: projectid,
      year: year,
      contractstartdate: contractstartdate
    }

    await processNotifyChangeCalendar(event["headers"]["Authorization"], body, CHANGE_MANAGEMENT_START_CALENDAR_PATH );
    
    const response = {statusCode: 200, body: {result: true}};
    processAddLog(userId, 'scheduleCalendarGenerate', event, response, response.statusCode)
    return response;
}

const getCurrentFiscal = () => {
    let date = new Date()
    if(date.getMonth() < 4){
        return (date.getFullYear() - 1)
    }
    return date.getFullYear();
}