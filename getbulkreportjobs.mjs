import { processAuthenticate } from './authenticate.mjs'
import { BUCKET_NAME, GetObjectCommand, s3Client, BUCKET_FOLDER_REPORTING } from './globals.mjs'
import { processDecryptData } from './decryptdata.mjs'
import { Buffer } from 'buffer'
export const processGetBulkReportJobs = async (event) => {
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
    
    let projectid = "";
    
    try {
        projectid = JSON.parse(event.body).projectid;
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        return response;
    }
    console.log('projectid', projectid)
    
    var command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: BUCKET_FOLDER_REPORTING + '/bulk_' + projectid + "_reports_enc.json",
    });
    
    let jsonData = {};
    
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        // console.log('responseBuffer', responseBuffer)
        let responsedata = responseBuffer.toString()
        if(!isJsonString(responsedata)){
            responsedata = await processDecryptData(projectid, responsedata)
        }
        jsonData = JSON.parse(responsedata);
        
    } catch (err) {
        console.log("log read",err); 
        jsonData = {}
    }
    
    // if(jsonData == null){
    //     return {statusCode: 404, body: {result: false, error:"File not found"}}
    // }
    
    // const currTs = new Date().getTime();
    // const fileKey = key + '_' + currTs + '_cache.json';
    
    // command = new PutObjectCommand({
    //   Bucket: BUCKET_NAME,
    //   Key: fileKey,
    //   Body: JSON.stringify(jsonData),
    //   ContentType: 'application/json'
    // });
    // let responseS3;
    // try {
    //   responseS3 = await s3Client.send(command);
    // } catch (err) {
    //   responseS3 = err;
    //   console.log(err);
    // }
    
    // command = new GetObjectCommand({
    //   Bucket: BUCKET_NAME,
    //   Key: fileKey,
    //   ContentType: 'application/json'
    // });
    
    // const signedUrlGet = await getSignedUrl(s3Client, command, { expiresIn: 1800 });
    
    // command = new DeleteObjectCommand({
    //   Bucket: BUCKET_NAME,
    //   Key: fileKey,
    // });
    
    // const signedUrlDelete = await getSignedUrl(s3Client, command, { expiresIn: 1800 });
    
    
    // return {statusCode: 200, body: {result: true, signedUrlGet: signedUrlGet, signedUrlDelete: signedUrlDelete}};
    return {statusCode: 200, body: {result: true, data: jsonData}};
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