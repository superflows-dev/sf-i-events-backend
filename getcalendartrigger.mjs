import { processAuthenticate } from './authenticate.mjs';
import { processAddLog } from './addlog.mjs';
import { processNotifyChange } from './notifychange.mjs';
import { processScheduleGetCalendarJob } from './schedulegetcalendarjob.mjs'
import { Buffer } from 'buffer'
export const processGetCalendarTrigger = async (event) => {
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
    
    console.log(email, accessToken);
    
    const authResult = await processAuthenticate(event["headers"]["Authorization"]);
    
    if(!authResult.result) {
        return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
    }
    
    const userId = authResult.userId;
    
    // const userId = "1234";
    
    var projectid = null;
    var triggers = null;
    var notifychange = null
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        triggers = JSON.parse(event.body).triggers;
        notifychange = JSON.parse(event.body).notifychange;
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    const evCalendar = {};
    
    evCalendar.body = JSON.stringify({
        projectid: projectid,
        year: getCurrentFiscal()
    });
    
    evCalendar.headers = event["headers"];
    
    const resultCalendar = await processScheduleGetCalendarJob(evCalendar)
    if(!resultCalendar.body.result) {
        
        const response = {statusCode: 409, body: {result: false, error: "Your request is registered. However, it is in pending state because of some technical issues! Please contact admin to complete it."}};
        processAddLog(userId, 'triggerevent', event, response, response.statusCode)
        return response;
        
    } else {
        
        if(notifychange == "true"){
            await processNotifyChange(event["headers"]["Authorization"], {projectid: projectid, triggers: triggers}, '/adhocalert'); 
        }
        let response = {statusCode: 200, body: {result: true}};
        processAddLog(userId, 'triggerevent', event, response, response.statusCode)
        return response;
    
    }
    
}
const getCurrentFiscal = () => {
    let date = new Date()
    if(date.getMonth() < 4){
        return (date.getFullYear() - 1)
    }
    return date.getFullYear();
}