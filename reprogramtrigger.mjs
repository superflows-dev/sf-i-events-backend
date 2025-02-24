// mapevent (events[], users[])


import { ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, UpdateItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, TIMEFRAME_BEFORE, TIMEFRAME_AFTER } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';

export const processReprogramTrigger = async (event) => {
    
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
    // var eventid = null;
    // var timestamp = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        // eventid = JSON.parse(event.body).eventid.trim();
        // timestamp = JSON.parse(event.body).timestamp.trim();
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
    
    // if(eventid == null || eventid == "" || eventid.length < 6) {
    //     const response = {statusCode: 400, body: {result: false, error: "Event Id is not valid!"}}
    //   // processAddLog(userId, 'detail', event, response, response.statusCode)
    //     return response;
    // }
    
    // if(timestamp == null || timestamp == "" || timestamp.length < 6) {
    //     const response = {statusCode: 400, body: {result: false, error: "Timestamp is not valid!"}}
    //   // processAddLog(userId, 'detail', event, response, response.statusCode)
    //     return response;
    // }
    
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
    
    const eventsJson = JSON.parse(resultGet.Item.events.S);
    const triggers = JSON.parse(unmarshalledItem.triggers);
    const triggerKeys = Object.keys(triggers);
    
    const ddbUpdate = async (updateParams) => {
        try {
            const data = await ddbClient.send(new UpdateItemCommand(updateParams));
            return data;
        } catch (err) {
            return err;
        }
    };
    
    console.log('triggers before', Object.keys(triggers));
    
    for(var i = 0; i < triggerKeys.length; i++) {
        
        console.log('triggerkey', triggerKeys[i]);
        
        for(var j = 0; j < triggers[triggerKeys[i]].length; j++) {
            
            const trigger = triggers[triggerKeys[i]][j];
            const dateofoccurrence = trigger["dateofoccurrence"];
            
            console.log('trigger', trigger["timestamp"]);
            
            var compliance = null;
            const events = JSON.parse(unmarshalledItem.events);
            for(var k = 0; k < Object.keys(events).length; k++) {
                if(Object.keys(events)[k] == "00/00") {
                    for(var l = 0; l < events[Object.keys(events)[k]].length; l++) {
                        //console.log('comparing events',events[Object.keys(events)[k]][l].id,triggerKeys[i]);
                        if(events[Object.keys(events)[k]][l].id == triggerKeys[i]) {
                            compliance = events[Object.keys(events)[k]][l]; 
                        }
                    }    
                }
            }
            
            if(compliance != null) {
                
                console.log('compliance', compliance.id);
                console.log('dateofoccurrence', dateofoccurrence);
                
                const timeframe = compliance.timeframe;
                const responsedays = (compliance.responsedays.replace(/"/g, ''))*24*60*60*1000;
                
                console.log('responsedays', responsedays);
                
                var newduedate = null;
                
                if(TIMEFRAME_BEFORE == timeframe) {
                    newduedate = new Date(parseInt(dateofoccurrence + "") - responsedays);
                } else {
                    newduedate = new Date(parseInt(dateofoccurrence + "") + responsedays);
                }
                
                console.log('newduedate', newduedate);
                
                const ddmm = ("0" + (newduedate.getDate())).slice(-2) + "/" +  ("0" + (newduedate.getMonth() + 1)).slice(-2);
                const mmdd = ("0" + (newduedate.getMonth()+1)).slice(-2) + "/" +  ("0" + (newduedate.getDate())).slice(-2);
                
                console.log('mmdd', mmdd);
                
                if(eventsJson[mmdd] == null) {
                    eventsJson[mmdd] = [];
                }
                
                var found = false;
        
                for(var l = 0; l < eventsJson[mmdd].length; l++) {
                    
                    console.log('trigger b',eventsJson[mmdd][l]["id"], compliance.id)
                    if(eventsJson[mmdd][l]["id"] == compliance.id) {
                        found = true;
                    }
                    
                }
                
                console.log('found', found);
                
                if(!found) {
                    
                    eventsJson[mmdd].push(compliance);
                    console.log('trigger c', eventsJson[mmdd].length); 
                
                    
                }
                
            } else {
                
                console.log('trigger no compliance', triggerKeys[i]);
                
            }
            
            
            
        }
        
        
    }
    
    
    var updateParams = {
        TableName: TABLE,
        Key: {
          projectid: { S: projectid },
        },
        UpdateExpression: "set #events1 = :events1",
        ExpressionAttributeValues: {
            ":events1": {"S": JSON.stringify(eventsJson)},
        },
        ExpressionAttributeNames:  {
            "#events1": "events",
        }
    };
    
    //console.log((eventsJson));
    
    var resultUpdate = await ddbUpdate(updateParams);
    console.log(resultUpdate);
    
    
    
    
    // // function sleep(ms) {
    // //   return new Promise((resolve) => {
    // //     setTimeout(resolve, ms);
    // //   });
    // // }
    
    // var finalResult = null;
    
    // for(var i = 0; i < triggers[compliance.id].length; i++) {
        
    //     console.log('comparing ts', triggers[compliance.id][i]["timestamp"], timestamp);
    //     if((triggers[compliance.id][i]["timestamp"] + "") != timestamp) {
    //         console.log('continue');
    //         continue;
    //     }
        
    //     const dateofoccurrence = triggers[compliance.id][i]["dateofoccurrence"];
    //     const responsedays = parseInt(compliance.responsedays.replace(/"/g, ''))*24*60*60*1000;
    //     const timeframe = compliance.timeframe;
        
    //     var newduedate = null;
    
    //     console.log('dateofoccurrence', new Date(parseInt(dateofoccurrence + "")));
    
    //     if(TIMEFRAME_BEFORE == timeframe) {
            
    //         newduedate = new Date(parseInt(dateofoccurrence + "") - responsedays);
            
    //     } else {
            
    //         newduedate = new Date(parseInt(dateofoccurrence + "") + responsedays);
            
    //     }
        
    //     console.log('newdateofoccurrence', newduedate);
        
    //     const ddmm = ("0" + (newduedate.getDate())).slice(-2) + "/" +  ("0" + (newduedate.getMonth() + 1)).slice(-2);
    //     const mmdd = ("0" + (newduedate.getMonth()+1)).slice(-2) + "/" +  ("0" + (newduedate.getDate())).slice(-2);
        
    //     if(eventsJson[mmdd] == null) {
    //         eventsJson[mmdd] = [];
    //     }
        
    //     console.log('trigger a', mmdd, eventsJson[mmdd].length);
        
    //     var found = false;
        
    //     for(var j = 0; j < eventsJson[mmdd].length; j++) {
            
    //         console.log('trigger b',eventsJson[mmdd][j]["id"], eventid)
    //         if(eventsJson[mmdd][j]["id"] == eventid) {
    //             found = true;
    //         }
            
    //     }
        
    //     if(!found) {
            
    //         await sleep(5000);
            
    //         eventsJson[mmdd].push(compliance);
    //         console.log('trigger c', eventsJson[mmdd].length); 
        
    //         var updateParams = {
    //             TableName: TABLE,
    //             Key: {
    //               projectid: { S: projectid },
    //             },
    //             UpdateExpression: "set #events1 = :events1",
    //             ExpressionAttributeValues: {
    //                 ":events1": {"S": JSON.stringify(eventsJson)},
    //             },
    //             ExpressionAttributeNames:  {
    //                 "#events1": "events",
    //             }
    //         };
            
    //         //console.log((eventsJson));
            
    //         var resultUpdate = await ddbUpdate(updateParams);
    //         console.log(resultUpdate);
    //         finalResult = resultUpdate;
            
            
    //     }
        
    // }

    const response = {statusCode: 200, body: {result: true}};
    processAddLog(userId, 'triggerevent', event, response, response.statusCode)
    return response;

}