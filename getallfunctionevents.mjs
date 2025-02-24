// getuserevents (projectid, userprofileid)


import { getSignedUrl, KMS_KEY_REGISTER, SERVER_KEY, ROLE_REPORTER, ROLE_APPROVER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR, FINCAL_START_MONTH, REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, QueryCommand, ADMIN_METHODS, BUCKET_NAME, s3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, VIEW_COUNTRY, VIEW_ENTITY, VIEW_LOCATION, VIEW_TAG } from "./globals.mjs";
import { processIsInCurrentFincal } from './isincurrentfincal.mjs';
import { processIsMyEvent } from './ismyevent.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { processDdbQuery } from './ddbquery.mjs';
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    

export const processGetAllFunctionEvents = async (event) => {
    
    console.log('inside processGetAllFunctionEvents');
    
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
    
    const userId = authResult.userId;
    
    // const userId = "1234";
    
    var projectid = null;
    var userprofileid = null
    var locationid = null;
    var entityid = null;
    var role = null;
    var searchstring = null;
    var meta = null;
    var selectedCountry = null;
    var selectedStatute = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        userprofileid = JSON.parse(event.body).userprofileid.trim();
        role = JSON.parse(event.body).role.trim();
        searchstring = JSON.parse(event.body).searchstring;
        locationid = JSON.parse(event.body).locationid.trim();
        entityid = JSON.parse(event.body).entityid.trim();
        meta = JSON.parse(event.body).meta ?? "";
        selectedCountry = JSON.parse(event.body).country ?? "";
        selectedStatute = JSON.parse(event.body).statute ?? "";
    } catch (e) {
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(userprofileid == null || userprofileid == "" || userprofileid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "User profile id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(role == null || role == "" || role.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Mode is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    let command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_calendar_db_job_enc.json',
    });
    
    var responseS3;
    var storedDB = {};
    let flagEncryptedNotFound = false
    try {
        responseS3 = await s3Client.send(command);
        const s3ResponseStream = responseS3.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        const jsonContent = JSON.parse(decryptedData);
        storedDB = jsonContent;
    } catch (err) {
      console.error(err); 
      flagEncryptedNotFound = true
    }
    if(flagEncryptedNotFound){
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_calendar_db_job.json',
        });
        
        responseS3;
        storedDB = {};
        try {
            responseS3 = await s3Client.send(command);
            const s3ResponseStream = responseS3.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            const jsonContent = JSON.parse(responseBuffer.toString());
            storedDB = jsonContent;
        } catch (err) {
          console.error(err);
        }
    }
    
    var arrEvents = {};
    
    for(var i = 0; i < Object.keys(storedDB).length; i++) {
        
        const country = Object.keys(storedDB)[i];
        console.log('country', country);
        if(meta != "" && (searchstring == null || searchstring == "")){
            
            for(var j = 0; j < Object.keys(storedDB[country]).length; j++) {
                
                const statute = Object.keys(storedDB[country])[j];
                // if(arrEvents[country] == null) {
                //     arrEvents[country] = {};
                // }
                
                // if(arrEvents[country][statute] == null) {
                //     arrEvents[country][statute] = {};
                // }

                
                for(var k = 0; k < Object.keys(storedDB[country][statute]).length; k++) {
                
                    const complianceId = Object.keys(storedDB[country][statute])[k];
                    
                    const arrCompliances = storedDB[country][statute][complianceId];
                
                    for(var l = 0; l < arrCompliances.length; l++) {
                        
                        const compliance = arrCompliances[l];
                    
                        if(locationid != null && locationid.length > 2) {
                            if(compliance.locationid != locationid) {
                                continue;
                            }
                        }
                        
                        if(entityid != null && entityid.length > 2) {
                            console.log('comparing',compliance.entityid,entityid);
                            if(compliance.entityid != entityid) {
                                continue;
                            }
                        }
                        
                        const reporters = compliance.reporters;
                        const approvers = compliance.approvers;
                        const functionheads = compliance.functionheads;
                        const auditors = compliance.auditors;
                        const viewers = compliance.viewers;
                        
                        var push = false;
                        
                        if(role == ROLE_REPORTER) {
                            if(JSON.stringify(reporters).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(role == ROLE_APPROVER) {
                            if(JSON.stringify(approvers).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(role == ROLE_FUNCTION_HEAD) {
                            if(JSON.stringify(functionheads).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(role == ROLE_AUDITOR) {
                            if(JSON.stringify(auditors).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(role == ROLE_VIEWER) {
                            if(JSON.stringify(viewers).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(push) {
                            
                            
                            if(searchstring != null && searchstring != "") {
                                
                                if(JSON.stringify(compliance).toLowerCase().indexOf(searchstring.toLowerCase()) >= 0) {
                                    push = true;
                                } else {
                                    push = false;
                                }
                                
                            }
                            
                            
                            if(push) {
                                
                                if(arrEvents[country] == null) {
                                    arrEvents[country] = {};
                                }
                                
                                if(arrEvents[country][statute] == null) {
                                    arrEvents[country][statute] = {};
                                }
                                if(meta == "all"){
                                    if(arrEvents[country][statute][complianceId] == null) {
                                        arrEvents[country][statute][complianceId] = compliance;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }else{
            if(searchstring != null && searchstring != ""){
                for(var j = 0; j < Object.keys(storedDB[country]).length; j++) {
                
                    const statute = Object.keys(storedDB[country])[j];
                    if(arrEvents[country] == null) {
                        arrEvents[country] = {};
                    }
                    
                    if(arrEvents[country][statute] == null) {
                        arrEvents[country][statute] = {};
                    }
                    for(var k = 0; k < Object.keys(storedDB[country][statute]).length; k++) {
                    
                        const complianceId = Object.keys(storedDB[country][statute])[k];
                        
                        const arrCompliances = storedDB[country][statute][complianceId];
                    
                        for(var l = 0; l < arrCompliances.length; l++) {
                            
                            const compliance = arrCompliances[l];
                        
                            if(locationid != null && locationid.length > 2) {
                                if(compliance.locationid != locationid) {
                                    continue;
                                }
                            }
                            
                            if(entityid != null && entityid.length > 2) {
                                console.log('comparing',compliance.entityid,entityid);
                                if(compliance.entityid != entityid) {
                                    continue;
                                }
                            }
                            
                            const reporters = compliance.reporters;
                            const approvers = compliance.approvers;
                            const functionheads = compliance.functionheads;
                            const auditors = compliance.auditors;
                            const viewers = compliance.viewers;
                            
                            var push = false;
                            
                            if(role == ROLE_REPORTER) {
                                if(JSON.stringify(reporters).indexOf(userprofileid) >= 0) {
                                    push = true;
                                }    
                            }
                            
                            if(role == ROLE_APPROVER) {
                                if(JSON.stringify(approvers).indexOf(userprofileid) >= 0) {
                                    push = true;
                                }    
                            }
                            
                            if(role == ROLE_FUNCTION_HEAD) {
                                if(JSON.stringify(functionheads).indexOf(userprofileid) >= 0) {
                                    push = true;
                                }    
                            }
                            
                            if(role == ROLE_AUDITOR) {
                                if(JSON.stringify(auditors).indexOf(userprofileid) >= 0) {
                                    push = true;
                                }    
                            }
                            
                            if(role == ROLE_VIEWER) {
                                if(JSON.stringify(viewers).indexOf(userprofileid) >= 0) {
                                    push = true;
                                }    
                            }
                            
                            if(push) {
                                
                                
                                if(searchstring != null && searchstring != "") {
                                    
                                    if(JSON.stringify(compliance).toLowerCase().indexOf(searchstring.toLowerCase()) >= 0) {
                                        push = true;
                                    } else {
                                        push = false;
                                    }
                                    
                                }
                                
                                
                                if(push) {
                                    
                                    if(arrEvents[country] == null) {
                                        arrEvents[country] = {};
                                    }
                                    
                                    if(arrEvents[country][statute] == null) {
                                        arrEvents[country][statute] = {};
                                    }
                                    
                                    if(arrEvents[country][statute][complianceId] == null) {
                                        arrEvents[country][statute][complianceId] = compliance;
                                    }
                                    
                                }
                                
                            }
                            
                        }
                    }
                }
            }else{
                for(var k = 0; k < Object.keys(storedDB[selectedCountry][selectedStatute]).length; k++) {
                    
                    const complianceId = Object.keys(storedDB[selectedCountry][selectedStatute])[k];
                    
                    const arrCompliances = storedDB[selectedCountry][selectedStatute][complianceId];
                
                    for(var l = 0; l < arrCompliances.length; l++) {
                        
                        const compliance = arrCompliances[l];
                    
                        if(locationid != null && locationid.length > 2) {
                            if(compliance.locationid != locationid) {
                                continue;
                            }
                        }
                        
                        if(entityid != null && entityid.length > 2) {
                            console.log('comparing',compliance.entityid,entityid);
                            if(compliance.entityid != entityid) {
                                continue;
                            }
                        }
                        
                        const reporters = compliance.reporters;
                        const approvers = compliance.approvers;
                        const functionheads = compliance.functionheads;
                        const auditors = compliance.auditors;
                        const viewers = compliance.viewers;
                        
                        var push = false;
                        
                        if(role == ROLE_REPORTER) {
                            if(JSON.stringify(reporters).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(role == ROLE_APPROVER) {
                            if(JSON.stringify(approvers).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(role == ROLE_FUNCTION_HEAD) {
                            if(JSON.stringify(functionheads).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(role == ROLE_AUDITOR) {
                            if(JSON.stringify(auditors).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(role == ROLE_VIEWER) {
                            if(JSON.stringify(viewers).indexOf(userprofileid) >= 0) {
                                push = true;
                            }    
                        }
                        
                        if(push) {
                            
                            
                            if(searchstring != null && searchstring != "") {
                                
                                if(JSON.stringify(compliance).toLowerCase().indexOf(searchstring.toLowerCase()) >= 0) {
                                    push = true;
                                } else {
                                    push = false;
                                }
                                
                            }
                            
                            
                            if(push) {
                                
                                if(arrEvents[selectedCountry] == null) {
                                    arrEvents[selectedCountry] = {};
                                }
                                
                                if(arrEvents[selectedCountry][selectedStatute] == null) {
                                    arrEvents[selectedCountry][selectedStatute] = {};
                                }
                                
                                if(arrEvents[selectedCountry][selectedStatute][complianceId] == null) {
                                    arrEvents[selectedCountry][selectedStatute][complianceId] = compliance;
                                }
                                
                            }
                            
                        }
                        
                    }
                }
            }
        }
    }
        
    
    
    console.log(arrEvents);
    
    const currTs = new Date().getTime();
    const fileKey = projectid + '_' + currTs + '_registers_view_job.json';
    
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: JSON.stringify(arrEvents),
      ContentType: 'application/json'
    });
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
      console.error(err);
    }
    
    command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    
    const signedUrlGet = await getSignedUrl(s3Client, command, { expiresIn: 1800 });
    
    command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    const signedUrlDelete = await getSignedUrl(s3Client, command, { expiresIn: 1800 });
    
    // const response = {statusCode: 200, body: {result: true, data: arrEvents}};
    const response = {statusCode: 200, body: {result: true, signedUrlGet: signedUrlGet, signedUrlDelete: signedUrlDelete}};
    return response;
    
}