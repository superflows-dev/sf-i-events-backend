import { processMapEvents } from './mapevents.mjs';
import { processSyncCalendar } from './synccalendar.mjs';
import { processGetUnmappedEvents } from './getunmappedevents.mjs';
import { processGetUserEvents } from './getuserevents.mjs';
import { processGetEventMappings } from './geteventmappings.mjs';
import { processDeleteEventMappings } from './deleteeventmappings.mjs';
import { processGetCalendar } from './getcalendar.mjs';

export const handler = async (event, context, callback) => {
    
    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin" : '*',
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "Authorization, Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Access-Control-Allow-Credentials, Content-Type, isBase64Encoded, x-requested-with",
        "Access-Control-Allow-Credentials" : true,
        'Content-Type': 'application/json',
        "isBase64Encoded": false
      },
    };
    
    if(event["httpMethod"] == "OPTIONS") {
      callback(null, response);
      return;
    }
    
    switch(event["path"]) {
      
        case "/mapevents":
          const resultMapEvents = await processMapEvents(event);
          response.body = JSON.stringify(resultMapEvents.body);
          response.statusCode = resultMapEvents.statusCode;
        break;
        
        case "/getcalendar":
          const resultGetCalendar = await processGetCalendar(event);
          response.body = JSON.stringify(resultGetCalendar.body);
          response.statusCode = resultGetCalendar.statusCode;
        break;

        case "/synccalendar":
          const resultSyncCalendar = await processSyncCalendar(event);
          response.body = JSON.stringify(resultSyncCalendar.body);
          response.statusCode = resultSyncCalendar.statusCode;
        break;
        
        case "/getunmappedevents":
          const resultGetUnmappedEvents = await processGetUnmappedEvents(event);
          response.body = JSON.stringify(resultGetUnmappedEvents.body);
          response.statusCode = resultGetUnmappedEvents.statusCode;
        break;
        
        case "/getuserevents":
          const resultGetUserEvents = await processGetUserEvents(event);
          response.body = JSON.stringify(resultGetUserEvents.body);
          response.statusCode = resultGetUserEvents.statusCode;
        break;
        
        case "/geteventmappings":
          const resultGetEventMappings = await processGetEventMappings(event);
          response.body = JSON.stringify(resultGetEventMappings.body);
          response.statusCode = resultGetEventMappings.statusCode;
        break;
        
        case "/deleteeventmappings":
          const resultDeleteEventMappings = await processDeleteEventMappings(event);
          response.body = JSON.stringify(resultDeleteEventMappings.body);
          response.statusCode = resultDeleteEventMappings.statusCode;
        break;
        
    }
    
    callback(null, response);
    
    return response;
};