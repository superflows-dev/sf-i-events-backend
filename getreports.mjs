// synccalendar (projectid, events)


import { BUCKET_NAME, SERVER_KEY, TABLE_R, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, s3Client, getSignedUrl } from "./globals.mjs";
import { processDecryptData } from './decryptdata.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { processAddLog } from './addlog.mjs';
import { processDdbQuery } from './ddbquery.mjs'
import { Buffer } from 'buffer'

export const processGetReports = async (event) => {
    
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
    
    const userId = authResult.userId;
    
    // const userId = "1234";
    
    var projectid = null;
    var userprofileid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        userprofileid = JSON.parse(event.body).userprofileid.trim();
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
    
     if(userprofileid == null || userprofileid == "" || userprofileid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Userprofileid is not valid!"}};
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    
    var queryParams = {
        expression: "#projectid1 = :projectid1",
        expressionAttributeValues: JSON.stringify({
          ":projectid1": { S: projectid }
        }),
        expressionAttributeNames:  JSON.stringify({
            "#projectid1": "projectid"
        }),
        tablename: TABLE_R
    };
    
    var ev = {
        body: JSON.stringify(queryParams),
        headers: {
            "x-server-key": SERVER_KEY
        }
        
    };
    
    const arrReports = (await processDdbQuery(ev)).body.result;
    
    let assReports = {}
    for(var i = 0; i < arrReports.length; i++) {
        
        var strData = arrReports[i].data.S;
        const sortid = (arrReports[i].sortid.S)
        if(!isJsonString(strData)){
            let decryptedData = ""
            try{
                if(strData.indexOf(':') < 0){
                    decryptedData = await processKmsDecrypt(projectid, strData)
                }else{
                    decryptedData = await processDecryptData(projectid, strData)
                }
                strData = decryptedData;
            }catch(e){
                console.log('decryption error', e.toString(), strData, sortid)
                strData = arrReports[i].data.S;
            }
            
        }
        
        //console.log(strData);
        
        //const jsonData = JSON.parse(strData)
        
        try {
            
            const _ev = JSON.parse(strData)['event'];
            
            if(_ev != null) {
                
                if(JSON.parse(_ev)['reportersmap'][userprofileid] != null) {
                
                    assReports[sortid] = strData;
                
                }
                
            }
                
        } catch (e) {
            console.log(e);
        }
        
        
    }
    const currTs = new Date().getTime();
    const fileKey = projectid + '_' + currTs + '_reports_job.json';
    
    let command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: JSON.stringify(assReports),
      ContentType: 'application/json'
    });
    try {
      await s3Client.send(command);
    } catch (err) {
      console.error(err);
    }
    
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    
    const signedUrlGet = await getSignedUrl(s3Client, command, { expiresIn: 1800 });
    
    command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    const signedUrlDelete = await getSignedUrl(s3Client, command, { expiresIn: 1800 });
    const response = {statusCode: 200, body: {result: true, signedUrlGet: signedUrlGet, signedUrlDelete: signedUrlDelete}};
    processAddLog(userId, 'upload', event, response, response.statusCode)
    return response;

}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        console.log(e);
        return false;
    }
    return true;
}