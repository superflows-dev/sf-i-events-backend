import { BUCKET_NAME, s3Client, GetObjectCommand } from "./globals.mjs";
import { processDecryptData } from './decryptdata.mjs';
import { Buffer } from 'buffer'
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