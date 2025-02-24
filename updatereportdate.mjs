// synccalendar (projectid, events)


import { KMS_KEY_REGISTER, TABLE_R, ddbClient, GetItemCommand, PutItemCommand, DeleteItemCommand, ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD } from "./globals.mjs";
import { processEncryptData } from './encryptdata.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { processAddLog } from './addlog.mjs';
import { Buffer } from 'buffer';
export const processUpdateReportDate = async (event) => {
    
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
    
    const userId = "1234";
    
    var projectid = null;
    var sortid = null
    var mmddyyyy = null;

    try {
        projectid = JSON.parse(event.body).projectid.trim();
        console.log(projectid);
        sortid = JSON.parse(event.body).sortid.trim();
        console.log(projectid);
        mmddyyyy = JSON.parse(event.body).mmddyyyy;
        console.log(mmddyyyy);
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body! " + event.body}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    // console.log(Object.keys(_event))
    // console.log('makercheckers',_event['makercheckers'])
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}};
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(sortid == null || sortid == "" || sortid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "sortid is not valid!"}};
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(mmddyyyy == null || mmddyyyy == "" || mmddyyyy.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "mmddyyyy is not valid!"}};
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    
    const ddbPut = async (setParams) => {
        try {
          const data = await ddbClient.send(new PutItemCommand(setParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    async function ddbGet (getParams) {
        try {
          const data = await ddbClient.send(new GetItemCommand(getParams));
          return data;
        } catch (err) {
          return err;
        }
    }
    async function ddbDelete (getParams) {
        try {
          const data = await ddbClient.send(new DeleteItemCommand(getParams));
          return data;
        } catch (err) {
          return err;
        }
    }
    
    var getParams = {
        TableName: TABLE_R,
        Key: {
          projectid: { S: projectid },
          sortid: { S: sortid}
        },
    };
    
    var resultGet = await ddbGet(getParams);
    
    let sortidArr = sortid.split(';')
    sortidArr[0] = mmddyyyy
    let newSortId = sortidArr.join(';')
    var dbData = {};
    
    if(resultGet.Item != null) {
        
        var decryptData;
        
        if(resultGet.Item.data.S.indexOf("::") >= 0) {
            
            decryptData = await processDecryptData(projectid, resultGet.Item.data.S);
            
        } else {
            
            if(KMS_KEY_REGISTER[projectid] != null) {
                const text = await processKmsDecrypt(projectid, resultGet.Item.data.S);
                decryptData = text.toLowerCase().indexOf('error') >= 0 ? resultGet.Item.data.S : text;
            } else {
                decryptData = resultGet.Item.data.S
            }
            
        }
        
        dbData = JSON.parse(decryptData);
    }
    var strData = JSON.stringify(dbData);
    
    var strDataEncrypt = "";
    
    if(KMS_KEY_REGISTER[projectid] != null) {
        
        strDataEncrypt = await processEncryptData(projectid, strData);
        
    } else {
        strDataEncrypt = strData;
    }
    
    
    var item = {
        projectid: {"S": projectid},
        sortid: { S: newSortId},
        data: {"S": strDataEncrypt}
    };
    
    var setParams = {
        TableName: TABLE_R,
        Item: item
    };
    
    console.log({
        projectid: {"S": projectid},
        sortid: { S: newSortId}
        }
    );
    
    await ddbPut(setParams);
    
    let deleteParams = {
        TableName: TABLE_R,
        Key: {
          projectid: { S: projectid },
          sortid: { S: sortid}
        },
    }
    
    await ddbDelete(deleteParams);
    
    const response = {statusCode: 200, body: {result: true}};
    processAddLog(userId, 'upload', event, response, response.statusCode)
    return response;

}