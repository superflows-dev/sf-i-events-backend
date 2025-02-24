import { BUCKET_NAME, s3Client, GetObjectCommand, PutObjectCommand } from "./globals.mjs";
import { processDecryptData } from './decryptdata.mjs';
import { processEncryptData } from './encryptdata.mjs';
import { processCheckLastModifiedFile } from './checklastmodifiedfile.mjs'
export const processAddUserLastTime = async (projectid, userid, fieldname) => {
    let usersData = {}
    let lastupdatedUserData;
    let flag = false;
    let newUserData = {};
    while(flag == false){
        var command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: 'users_last_access_' + projectid + '_enc.json',
        });
        
        let responseS3;
        try {
            responseS3 = await s3Client.send(command);
            const s3ResponseStream = responseS3.Body;
            lastupdatedUserData = responseS3.LastModified
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
            usersData = JSON.parse(decryptedData);
            
        } catch (err) {
            console.log('status index read error', err);
            flag = true;
        }

        if(usersData[userid] != null){
            newUserData = usersData[userid]
        }
        if(flag != true){
            flag = processCheckLastModifiedFile('users_last_access_' + projectid + '_enc.json', lastupdatedUserData, "")
        }
    }
    newUserData[fieldname] = new Date().getTime();
    usersData[userid] = newUserData

    let encryptedData = await processEncryptData(projectid, JSON.stringify(usersData));
    command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'users_last_access_' + projectid + '_enc.json',
        Body: encryptedData,
        ContentType: 'application/json'
    });
    let responseS3;
    try {
        responseS3 = await s3Client.send(command);
    } catch (err) {
        responseS3 = err;
        console.error(err);
    }

    return;
}