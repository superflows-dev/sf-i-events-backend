// getunmappedevents (projectid)

// import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, TABLE_COU, TABLE_LOC, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, UpdateItemCommand, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, DeleteItemCommand, QueryCommand, PutObjectCommand, BUCKET_NAME, s3Client, TABLE_COU_JOBS, TABLE_ENT_JOBS, TABLE_LOC_JOBS, TABLE_FUNC_JOBS, TABLE_TAG_JOBS, TABLE_REP_JOBS, TABLE_APPR_JOBS, TABLE_FHEAD_JOBS, TABLE_AUD_JOBS, TABLE_VIEW_JOBS, TABLE_DOCS_JOBS, TABLE_MAK_JOBS, TABLE_DUE_JOBS, TABLE_ALE_JOBS, TABLE_IC_JOBS} from "./globals.mjs";
import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, ddbClient, DeleteItemCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { Buffer } from 'buffer';
export const processCancelOnboardingJob = async (event) => {
    
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
    var onboardingstep = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        onboardingstep = JSON.parse(event.body).onboardingstep.trim();
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
    
    if(onboardingstep == null || onboardingstep == "" || onboardingstep.length < 2) {
        const response = {statusCode: 400, body: {result: false, error: "Onboardingstep is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    var tableName = "";
    
    // if(onboardingstep == "countries") {
    //     tableName = TABLE_COU_JOBS;
    // }
    
    // if(onboardingstep == "entities") {
    //     tableName = TABLE_ENT_JOBS;
    // }
    
    // if(onboardingstep == "locations") {
    //     tableName = TABLE_LOC_JOBS;
    // }
    
    // if(onboardingstep == "functions") {
    //     tableName = TABLE_FUNC_JOBS;
    // }
    
    // if(onboardingstep == "tags") {
    //     tableName = TABLE_TAG_JOBS;
    // }
    
    // if(onboardingstep == "reporters") {
    //     tableName = TABLE_REP_JOBS;
    // }
    
    // if(onboardingstep == "approvers") {
    //     tableName = TABLE_APPR_JOBS;
    // }
    
    // if(onboardingstep == "functionheads") {
    //     tableName = TABLE_FHEAD_JOBS;
    // }
    
    // if(onboardingstep == "auditors") {
    //     tableName = TABLE_AUD_JOBS;
    // }
    
    // if(onboardingstep == "viewers") {
    //     tableName = TABLE_VIEW_JOBS;
    // }
    
    // if(onboardingstep == "docs") {
    //     tableName = TABLE_DOCS_JOBS;
    // }
    
    // if(onboardingstep == "makercheckers") {
    //     tableName = TABLE_MAK_JOBS;
    // }
    
    // if(onboardingstep == "duedates") {
    //     tableName = TABLE_DUE_JOBS;
    // }
    
    // if(onboardingstep == "alertschedules") {
    //     tableName = TABLE_ALE_JOBS;
    // }
    
    // if(onboardingstep == "internalcontrols") {
    //     tableName = TABLE_IC_JOBS;
    // }
    
    var item = {
        projectid: {"S": projectid},
    }
    
    var deleteParams = {
        TableName: tableName,
        Key: item
    };
    
    const ddbDelete = async (queryParams) => {
        try {
            const data = await ddbClient.send(new DeleteItemCommand(queryParams));
            return data;
        } catch (err) {
            return err;
        }
    };
    
    await ddbDelete(deleteParams);
    
    const response = {statusCode: 200, body: {result: true}};
    return response;
}