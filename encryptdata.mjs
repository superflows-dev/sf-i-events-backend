// getunmappedevents (projectid)

import { processKmsEncrypt } from './kmsencrypt.mjs';
import { newUuidV4 } from './newuuid.mjs';
import crypto from 'crypto';
import { Buffer } from 'buffer';

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