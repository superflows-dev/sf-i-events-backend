// getunmappedevents (projectid)

import { ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand, QueryCommand, ADMIN_METHODS, FINCAL_START_MONTH, UpdateItemCommand, SERVER_KEY, kmsClient, EncryptCommand, KMS_KEY_REGISTER } from "./globals.mjs";
import { processKmsEncrypt } from './kmsencrypt.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { newUuidV4 } from './newuuid.mjs';
import crypto from 'crypto';
 

export const processDecryptData = async (projectid, strData) => {
    
    const strArr = strData.split("::");
    const newEncSecret = strArr[0];
    const newEncKey = strArr[1];
    const newBaseIV = strArr[2];
    
    // console.log('newEncSecret', newEncSecret);
    // console.log('newEncKey', newEncKey);
    console.log('newBaseIV', newBaseIV);
    // // console.log('strArr[3]', strArr[3]);
    
    const newSecret = await processKmsDecrypt(projectid, newEncSecret);
    // console.log('newSecret', newSecret);
    const newKey = await processKmsDecrypt(projectid, newEncKey);
    const newIV = Buffer.from(newBaseIV, 'base64');
    
    const buff = Buffer.from(strArr[3], 'base64')
    const decipher = crypto.createDecipheriv("aes-256-cbc", newKey, newIV)
    var strDataDecrypt = decipher.update(buff.toString('utf8'), 'hex', 'utf8') + decipher.final('utf8');
    
    // console.log('strDataDecrypt', strDataDecrypt);
    
    return strDataDecrypt;
    
}