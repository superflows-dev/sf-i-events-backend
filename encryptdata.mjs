// getunmappedevents (projectid)

import { ROLE_APPROVER, ROLE_REPORTER, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand, QueryCommand, ADMIN_METHODS, FINCAL_START_MONTH, UpdateItemCommand, SERVER_KEY, kmsClient, EncryptCommand, KMS_KEY_REGISTER } from "./globals.mjs";
import { processKmsEncrypt } from './kmsencrypt.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { newUuidV4 } from './newuuid.mjs';
import crypto from 'crypto';


export const processEncryptData = async (projectid, strData) => {
    const newSecret = newUuidV4();
    const newKey = crypto.createHash('sha256').update(String(newSecret)).digest('base64').substr(0, 32);
    const newIV = crypto.randomBytes(16);
    const newIVStr = newIV.toString('base64')
    
    const newEncSecret = await processKmsEncrypt(projectid, newSecret);
    const newEncKey = await processKmsEncrypt(projectid, newKey);
    
    const cipher = crypto.createCipheriv("aes-256-cbc", newKey, newIV)
    var strDataEncrypt = Buffer.from(
        cipher.update(strData, 'utf8', 'hex') + cipher.final('hex')
    ).toString('base64');
    
    strDataEncrypt = newEncSecret + "::" + newEncKey + "::" + newIVStr + "::" + strDataEncrypt;
    
    return strDataEncrypt;
    
}