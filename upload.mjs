// synccalendar (projectid, events)


import { UPLOAD_TYPE_REVIEW, UPLOAD_TYPE_REPORT, TABLE, ddbClient, UpdateItemCommand, GetItemCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAddLog } from './addlog.mjs';
import { Buffer } from 'buffer';
export const processUpload = async (event) => {
    
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
    var type = null;
    var comments = null;
    var docs = null;
    var approved = null;
    var mmddyyyy = null;
    var dateofcompletion = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        console.log(projectid);
        eventid = JSON.parse(event.body).eventid.trim();
        console.log(eventid);
        type = JSON.parse(event.body).type.trim();
        console.log(type);
        comments = JSON.parse(event.body).comments.trim();
        console.log(type);
        docs = JSON.parse(event.body).docs;
        console.log(docs);
        approved = JSON.parse(event.body).approved;
        console.log(approved);
        mmddyyyy = JSON.parse(event.body).mmddyyyy;
        console.log(mmddyyyy);
        dateofcompletion = JSON.parse(event.body).dateofcompletion;
        console.log(dateofcompletion);
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
    
    if(eventid == null || eventid == "" || eventid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Event Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(mmddyyyy == null || mmddyyyy == "" || mmddyyyy.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "mmddyyyy is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(type == null || type == "" || type.length < 1) {
        const response = {statusCode: 400, body: {result: false, error: "Type is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(comments == null) {
        const response = {statusCode: 400, body: {result: false, error: "Comments are not valid!"}}
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
    
    if (type == UPLOAD_TYPE_REPORT) {
        
        if(docs == null && docs.length === 0) {
            const response = {statusCode: 400, body: {result: false, error: "Docs are not valid!"}}
           // processAddLog(userId, 'detail', event, response, response.statusCode)
            return response;
        }
        
        if(dateofcompletion == null || dateofcompletion == "" || dateofcompletion.length < 1) {
            const response = {statusCode: 400, body: {result: false, error: "DateOfCompletion is not valid!"}}
           // processAddLog(userId, 'detail', event, response, response.statusCode)
            return response;
        }
        
        const getDocs = resultGet.Item.docs;
        console.log(getDocs);
        let tempDocs = null;
        if(getDocs == null || getDocs.S == "") {
            tempDocs = {};
        } else {
            tempDocs = JSON.parse(getDocs.S);
        }
        tempDocs[eventid] = {};
        tempDocs[eventid][mmddyyyy] = docs;
        const setDocs = JSON.stringify(tempDocs);
        
        const getComments = resultGet.Item.comments;
        let tempComments = null;
        if(getComments == null || getComments.S == "") {
            tempComments = {};
        } else {
            tempComments = JSON.parse(getComments.S);
        }
        
        if(tempComments[eventid] == null) {
            tempComments[eventid] = {}
            tempComments[eventid][mmddyyyy] = [{"author":"Reporter", "comment": comments + ' (Documents Saved: '+(JSON.parse(docs).length)+')', "timestamp": (new Date()).toUTCString() + ""}];
        } else {
            if(tempComments[eventid][mmddyyyy] == null) {
                tempComments[eventid][mmddyyyy] = [{"author":"Reporter", "comment": comments + ' (Documents Saved: '+(JSON.parse(docs).length)+')', "timestamp": (new Date()).toUTCString() + ""}];
            } else {
                const arr = tempComments[eventid][mmddyyyy];
                arr.push({"author": "Reporter", "comment": comments + ' (Documents Saved: '+(JSON.parse(docs).length)+')', "timestamp": (new Date()).toUTCString() + ""});
                tempComments[eventid] = {}
                tempComments[eventid][mmddyyyy] = arr;
            }
        }
        const setComments = JSON.stringify(tempComments);
        
        const getLastUpdated = resultGet.Item.lastupdated;
        let tempLastUpdated = null;
        if(getLastUpdated == null || getLastUpdated.S == "") {
            tempLastUpdated = {};
        } else {
            tempLastUpdated = JSON.parse(getLastUpdated.S);
        }
        tempLastUpdated[eventid] = {};
        tempLastUpdated[eventid][mmddyyyy] = (new Date()).toUTCString() + "";
        const setLastUpdated = JSON.stringify(tempLastUpdated);
        
        const getDateOfCompletion = resultGet.Item.dateofcompletion;
        let tempDateOfCompletion = null;
        if(getDateOfCompletion == null || getDateOfCompletion.S == "") {
            tempDateOfCompletion = {};
        } else {
            tempDateOfCompletion = JSON.parse(getDateOfCompletion.S);
        }
        tempDateOfCompletion[eventid] = {};
        tempDateOfCompletion[eventid][mmddyyyy] = dateofcompletion;
        const setDateOfCompletion = JSON.stringify(tempDateOfCompletion);
        
        var updateParams = {
            TableName: TABLE,
            Key: {
              projectid: { S: projectid },
            },
            UpdateExpression: "set #docs1 = :docs1, #comments1 = :comments1, #lastupdated1 = :lastupdated1, #dateofcompletion1 = :dateofcompletion1",
            ExpressionAttributeValues: {
                ":docs1": {"S": setDocs},
                ":comments1": {"S": setComments},
                ":lastupdated1": {"S": setLastUpdated},
                ":dateofcompletion1": {"S": setDateOfCompletion}
            },
            ExpressionAttributeNames:  {
                "#docs1": "docs",
                "#comments1": "comments",
                "#lastupdated1": "lastupdated",
                "#dateofcompletion1": "dateofcompletion"
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
      
        var resultUpdate = await ddbUpdate();
        console.log(resultUpdate);
        
    }
    
    if (type == UPLOAD_TYPE_REVIEW) {
        
        if(approved == null) {
            const response = {statusCode: 400, body: {result: false, error: "Approved is not valid!"}}
           // processAddLog(userId, 'detail', event, response, response.statusCode)
            return response;
        }
        
        const getApproved = resultGet.Item.approved;
        let tempApproved = null;
        if(getApproved == null || getApproved.S == "") {
            tempApproved = {};
        } else {
            tempApproved = JSON.parse(getApproved.S);
        }
        tempApproved[eventid] = {};
        tempApproved[eventid][mmddyyyy] = approved;
        const setApproved = JSON.stringify(tempApproved);
        
        const getComments = resultGet.Item.comments;
        let tempComments = null;
        if(getComments == null || getComments.S == "") {
            tempComments = {};
        } else {
            tempComments = JSON.parse(getComments.S);
        }
        if(tempComments[eventid] == null) {
            tempComments[eventid] = {};
            tempComments[eventid][mmddyyyy] = [{"author":"Approver", "comment": comments + ' (Approved: '+(approved?'Yes':'No')+')', "timestamp": (new Date()).toUTCString() + ""}];
        } else {
            const arr = tempComments[eventid][mmddyyyy];
            arr.push({"author": "Approver", "comment": comments + ' (Approved: '+(approved?'Yes':'No')+')', "timestamp": (new Date()).toUTCString() + ""});
            tempComments[eventid] = {};
            tempComments[eventid][mmddyyyy] = arr;
        }
        const setComments = JSON.stringify(tempComments);
        
        const getLastUpdated = resultGet.Item.lastupdated;
        let tempLastUpdated = null;
        if(getLastUpdated == null || getLastUpdated.S == "") {
            tempLastUpdated = {};
        } else {
            tempLastUpdated = JSON.parse(getLastUpdated.S);
        }
        tempLastUpdated[eventid] = {};
        tempLastUpdated[eventid][mmddyyyy] = (new Date()).toUTCString() + "";
        const setLastUpdated = JSON.stringify(tempLastUpdated);
        
        updateParams = {
            TableName: TABLE,
            Key: {
              projectid: { S: projectid },
            },
            UpdateExpression: "set #approved1 = :approved1, #comments1 = :comments1, #lastupdated1 = :lastupdated1",
            ExpressionAttributeValues: {
                ":approved1": {"S": setApproved},
                ":comments1": {"S": setComments},
                ":lastupdated1": {"S": setLastUpdated}
            },
            ExpressionAttributeNames:  {
                "#approved1": "approved",
                "#comments1": "comments",
                "#lastupdated1": "lastupdated"
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
      
        resultUpdate = await ddbUpdate();
        console.log(resultUpdate);
        
    }
    
    const response = {statusCode: 200, body: {result: true}};
    processAddLog(userId, 'upload', event, response, response.statusCode)
    return response;

}