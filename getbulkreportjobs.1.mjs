import { processAuthenticate } from './authenticate.mjs'
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, s3Client, KMS_KEY_REGISTER, getSignedUrl, BUCKET_FOLDER_REPORTING } from './globals.mjs'
import { processDecryptData } from './decryptdata.mjs'
import { processGetModuleBucketname } from './getmodulebucketname.mjs'
export const processGetBulkReportJobs1 = async (event) => {
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
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        return response;
    }
    console.log('projectid', projectid)
    
    let module = "events";
    try {
        module = JSON.parse(event.body).module ?? "events";
    }catch(e){
        
    }
    let bucketname = processGetModuleBucketname(module);
    var command = new GetObjectCommand({
        Bucket: bucketname,
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
    
    return {statusCode: 200, body: {result: true, data: jsonData}};
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}