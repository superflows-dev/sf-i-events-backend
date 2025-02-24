import { getSignedUrl, KMS_KEY_REGISTER, SERVER_KEY, ROLE_REPORTER, ROLE_APPROVER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR, FINCAL_START_MONTH, REGION, TABLE,  AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, ADMIN_METHODS, BUCKET_NAME, s3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, VIEW_COUNTRY, VIEW_ENTITY, VIEW_LOCATION, VIEW_TAG, BUCKET_FOLDER_REPORTING } from "./globals.mjs";
import { processDecryptData } from './decryptdata.mjs';
export const processGetUserLastTime = async (projectid) => {
    let usersData = {}
    var command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'users_last_access_' + projectid + '_enc.json',
    });
    
    let responseS3;
    try {
        responseS3 = await s3Client.send(command);
        const s3ResponseStream = responseS3.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        usersData = JSON.parse(decryptedData);
        
    } catch (err) {
        console.log('status index read error', err);
    }
    console.log('usersLastData', usersData)
    return usersData;
}