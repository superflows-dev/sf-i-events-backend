import { KMS_KEY_REGISTER, UPLOAD_TYPE_REVIEW, UPLOAD_TYPE_REPORT, ADMIN_METHODS, BUCKET_NAME, BUCKET_FOLDER_REPORTING, GetObjectCommand, PutObjectCommand, s3Client } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs'
export const processCopyReportingToMonthly = async (event) => {
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
    var projectid = null;
    try{
         projectid = JSON.parse(event.body).projectid.trim();
    }catch(e){
        const response = {statusCode: 400, body: { result: false, error: "Malformed body! " + event.body}};
        return response;
    }
    
    let assReports = {};
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
    });
    // console.log('project reports', Object.keys(assReports));
    let responseS3;
    try {
        responseS3 = await s3Client.send(command);
        const s3ResponseStream = responseS3.Body;
        const chunks = [];
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk);
        }
        const responseBuffer = Buffer.concat(chunks);
        const jsonContent = JSON.parse(responseBuffer.toString());
        assReports = jsonContent;
        
    } catch (err) {
      console.error(err); 
    }
    let assReportsMonthly = {}
    
    for(let sortid of Object.keys(assReports)){
        let mmddyyyy = sortid.split(';')[0]
        let mm = mmddyyyy.split('/')[0]
        if(assReportsMonthly[mm] == null){
            assReportsMonthly[mm] = {}
        }
        assReportsMonthly[mm][sortid] = assReports[sortid]
    }
    console.log('monthly reports', Object.keys(assReportsMonthly));
    for(let month of Object.keys(assReportsMonthly)){
        let putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + month + "_enc.json",
            Body: JSON.stringify(assReportsMonthly[month]),
            ContentType: 'application/json'
        })
        
        try {
            await s3Client.send(putCommand);
        } catch (err) {
          console.log('putCommand err', err); 
        }
    }
    const response = {statusCode: 200, body: { result: true}};
    return response;
}