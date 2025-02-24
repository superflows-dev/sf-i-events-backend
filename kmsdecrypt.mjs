// getunmappedevents (projectid)

import { kmsClient, DecryptCommand, KMS_KEY_REGISTER } from "./globals.mjs";

function text2Binary(string) {
    return string.split('').map(function (char) {
        return char.charCodeAt(0).toString(2);
    }).join(' ');
}

export const processKmsDecrypt = async (projectid, plaintext) => {

    
    // console.log('plaintext', plaintext);
    
    // var plainText = "";
    var input;
    
    // try {
    //     // plainText = Buffer.from(plaintext, 'base64').toString('utf-8');
    //     input = {
    //       "KeyId": KMS_KEY_REGISTER[projectid],
    //       "CiphertextBlob": Buffer.from(plainText, 'base64')
          
    //     };
    // } catch {
    //     plainText = plaintext + "";
    //     console.log('plaintext', plainText);
    //     input = {
    //       "KeyId": KMS_KEY_REGISTER[projectid],
    //       "CiphertextBlob": Buffer.from(plainText, 'base64')
          
    //     };
    // }
    
    try {
    
        input = {
          "KeyId": KMS_KEY_REGISTER[projectid],
          "CiphertextBlob": Buffer.from(plaintext, 'base64')
          
        };
        
    } catch (e) {
        
        console.log(e);
        return "Error";
        
    }
     
    const command = new DecryptCommand(input);
    
    try {
    
        const response = await kmsClient.send(command);  
        // console.log(new Buffer.from(response.Plaintext, 'binary').toString('utf-8'));
        return new Buffer.from(response.Plaintext, 'binary').toString('utf-8');
        
    } catch (err) {
        console.log(command);
        // return err + "";
        
    }
    
}