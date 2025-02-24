// synccalendar (projectid, events)


import { KMS_KEY_REGISTER, TABLE_R, ddbClient, ScanCommand, BUCKET_NAME, BUCKET_FOLDER_REPORTING, PutObjectCommand, s3Client } from "./globals.mjs";
import { processEncryptData } from './encryptdata.mjs';
import { processDecryptData } from './decryptdata.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processAuthenticate } from './authenticate.mjs';

export const processMigrateReporting = async (event) => {
    
    console.log('processing reporting migration', event.body);
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
    const input = {
        "TableName": TABLE_R,
        // "Limit": 50
    };    
    const delay = ms => new Promise(res => setTimeout(res, ms));
    
    const arrRecords = [];
    const ddbScanRecords = async (queryParams, exclusiveStartKey = null) => {
        console.log('inside scan');
        
        try {
            if(exclusiveStartKey != null) {
                queryParams['ExclusiveStartKey'] = exclusiveStartKey;
            }
            const data = await ddbClient.send(new ScanCommand(queryParams));
            // console.log('data', data.length);
            for(var m = 0; m < (data.Items ?? []).length; m++) {
                arrRecords.push(data.Items[m]);
            }
            if(data.LastEvaluatedKey != null) {
                await delay(2000);
                await ddbScanRecords(queryParams, data.LastEvaluatedKey);
            }
            return;
        } catch (err) {
            console.log('inside scan', err);
            return err;
        }
    };
    await ddbScanRecords(input);
    let allReportData = {}
    console.log('arrRecords', arrRecords.length);
    for(let record of arrRecords){
        let projectid = record.projectid.S
        if (allReportData[projectid] == null){
            allReportData[projectid] = {}
        }
        let sortid = record.sortid.S
        
        if(sortid == "3/31/*,30;c989a44e-7d3d-427e-b712-90eacf585075;38dc8c53-643f-4fee-83fe-f15239606277;0a5fb99f-c36f-46c0-85b4-7fa3d48fa134"){
            continue;
        }
        let recorddata = record.data.S
        
        let decryptData;
        // let flagNonEncrypted = false
        try {
            
            
            if(recorddata.indexOf("::") >= 0) {
                
                decryptData = await processDecryptData(projectid, recorddata);
                
            } else {
                // flagNonEncrypted = true
                if(KMS_KEY_REGISTER[projectid] != null && !isJsonString(recorddata)) {
                    const text = await processKmsDecrypt(projectid, recorddata);
                    decryptData = text.toLowerCase().indexOf('error') >= 0 ? recorddata : text;
                } else {
                    decryptData = recorddata
                }
                
            }
        } catch (err) {
            console.log("decrypt",err, sortid); 
            // decryptData = recorddata
        } 
        
        
        
        var strData = decryptData;
        let strDataEncrypt;
        if(KMS_KEY_REGISTER[projectid] != null) {
    
            strDataEncrypt = await processEncryptData(projectid, strData);
            
        } else {
            strDataEncrypt = strData;
        }
        allReportData[projectid][sortid] = strDataEncrypt
        // var strDataEncrypt = "";
        
        
        // let deleteCommand = new DeleteObjectCommand({
        //     Bucket: BUCKET_NAME,
        //     Key: BUCKET_FOLDER_REPORTING + '/' + mmddyyyy.replace(/\//g, '-') + ';' + entityid + ';' + locationid + ';' + eventid + "_enc.json",
        // })
        // let flagFileNotFound = false;
        // let newData;
        // try {
        //     const response = await s3Client.send(deleteCommand);
        // } catch (err) {
            
        // }
        // if(flagNonEncrypted){
        //     if(KMS_KEY_REGISTER[projectid] != null) {
            
        //         strDataEncrypt = await processEncryptData(projectid, strData);
                
        //     } else {
        //         strDataEncrypt = strData;
        //     }
        // }
        
        
        // if(flagNonEncrypted){
        //     if(flagFileNotFound){
        //         if(KMS_KEY_REGISTER[projectid] != null) {
            
        //             strDataEncrypt = await processEncryptData(projectid, strData);
                    
        //         } else {
        //             strDataEncrypt = strData;
        //         }
                
        //         let putCommand = new PutObjectCommand({
        //             Bucket: BUCKET_NAME,
        //             Key: BUCKET_FOLDER_REPORTING + '/' + mmddyyyy.replace(/\//g, '-') + ';' + entityid + ';' + locationid + ';' + eventid + "_enc.json",
        //             Body: strDataEncrypt,
        //             ContentType: 'application/json'
        //         })
                
        //         try {
        //             await s3Client.send(putCommand);
        //         } catch (err) {
                    
        //         }
        //     }
        // }else{
        //     if(flagFileNotFound){
        //         if(KMS_KEY_REGISTER[projectid] != null) {
                
        //             strDataEncrypt = await processEncryptData(projectid, strData);
                    
        //         } else {
        //             strDataEncrypt = strData;
        //         }
                
        //         let putCommand = new PutObjectCommand({
        //             Bucket: BUCKET_NAME,
        //             Key: BUCKET_FOLDER_REPORTING + '/' + mmddyyyy.replace(/\//g, '-') + ';' + entityid + ';' + locationid + ';' + eventid + "_enc.json",
        //             Body: strDataEncrypt,
        //             ContentType: 'application/json'
        //         })
                
        //         try {
        //             await s3Client.send(putCommand);
        //         } catch (err) {
                    
        //         }
        //     }else{
        //         if(KMS_KEY_REGISTER[projectid] != null) {
                
        //             strDataEncrypt = await processEncryptData(projectid, strData);
                    
        //         } else {
        //             strDataEncrypt = strData;
        //         }
        //         if(strDataEncrypt !== newData){
        //             let putCommand = new PutObjectCommand({
        //                 Bucket: BUCKET_NAME,
        //                 Key: BUCKET_FOLDER_REPORTING + '/' + mmddyyyy.replace(/\//g, '-') + ';' + entityid + ';' + locationid + ';' + eventid + "_enc.json",
        //                 Body: strDataEncrypt,
        //                 ContentType: 'application/json'
        //             })
                    
        //             try {
        //                 await s3Client.send(putCommand);
        //             } catch (err) {
                        
        //             }
        //         }
        //     }
        // }
    }
    
    for(let projectid of Object.keys(allReportData)){
        let projectReportingData = allReportData[projectid]
        let putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
            Body: JSON.stringify(projectReportingData),
            ContentType: 'application/json'
        })
        
        try {
            await s3Client.send(putCommand);
        } catch (err) {
            console.log("writing err", err)
        }
    }
    // const response = {statusCode: 200, body: {result: true, notifyChange: notifyChange}};
    const response = {statusCode: 200, body: {result: true}};
    // processAddLog(userId, 'upload', event, response, response.statusCode)
    return response;

}
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}