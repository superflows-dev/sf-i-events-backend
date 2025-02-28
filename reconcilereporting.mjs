import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { ROLE_CLIENTADMIN, ROLE_CLIENTCOORD, ROLE_CLIENTSPOC, s3Client, GetObjectCommand, PutObjectCommand, BUCKET_NAME, BUCKET_FOLDER_REPORTING, KMS_KEY_REGISTER } from './globals.mjs'
import { processDecryptData } from './decryptdata.mjs';
import { processKmsDecrypt } from './kmsdecrypt.mjs';
import { Buffer } from 'buffer'
export const processReconcileReporting = async (event) => {
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
    const authoResult = await processAuthorize(event["headers"]["Authorization"], email);
    if(!authResult.admin.BOOL) {
        const authoRole = authoResult.result[0]["role"] != null ? JSON.parse(authoResult.result[0]["role"].S) : "";
        if(!authResult.result) {
            return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
        }
        if(!authResult.admin.BOOL && authoRole != ROLE_CLIENTADMIN && authoRole != ROLE_CLIENTSPOC && authoRole != ROLE_CLIENTCOORD) {
            return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
        }    
    }
    var projectid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Project Id is not valid!"}};
      // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    let assReports = {};
    let responseS3;
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
    });
    
    
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
      console.error(err.Code, BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json"); 
    }
    
    let assReportsMonthly = {}
    for(let m = 1; m <= 12; m++){
        let mm = ("0" + m).slice(-2);
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
        });
        
        try {
            responseS3 = await s3Client.send(command);
            const s3ResponseStream = responseS3.Body;
            const chunks = [];
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk);
            }
            const responseBuffer = Buffer.concat(chunks);
            const jsonContent = JSON.parse(responseBuffer.toString());
            assReportsMonthly[mm] = jsonContent;
            
        } catch (err) {
          console.error(err); 
        }
    }
    let deltaReporting = {}
    console.log('months ', Object.keys(assReportsMonthly))
    for(let mm of Object.keys(assReportsMonthly)){
        for(let sortid of Object.keys(assReportsMonthly[mm])){
            if(assReports[sortid] == null || assReportsMonthly[mm][sortid].length > assReports[sortid].length){
                let strDataEncrypt = assReportsMonthly[mm][sortid]
                var decryptData;
                let dbComments = []     
                if(strDataEncrypt.indexOf("::") >= 0) {
                    
                    decryptData = await processDecryptData(projectid, strDataEncrypt);
                    
                } else {
                    
                    if(KMS_KEY_REGISTER[projectid] != null) {
                        const text = await processKmsDecrypt(projectid, strDataEncrypt);
                        decryptData = text.toLowerCase().indexOf('error') >= 0 ? strDataEncrypt : text;
                    } else {
                        decryptData = strDataEncrypt
                    }
                    
                }
                let data;
                try{
                    data = JSON.parse(decryptData);
                    dbComments = data.comments;
                }catch(e){
                    console.error(e)    
                }
                console.log('dbComments',dbComments);
                if(dbComments.length == 0){continue;}
                let sortidArr = sortid.split(';')
                // let mmddyyyy = sortidArr[0]
                let entityid = sortidArr[1]
                let locationid = sortidArr[2]
                let eventid = sortidArr[3]
                let username = dbComments[0].username
                let latestComment = dbComments[dbComments.length - 1]
                latestComment.totalComments = dbComments.length
                let latestCommentYearly = {}
                if(assReports[sortid] != null){
                    strDataEncrypt = assReports[sortid]
                    dbComments = []
                    if(strDataEncrypt.indexOf("::") >= 0) {
                    
                        decryptData = await processDecryptData(projectid, strDataEncrypt);
                        
                    } else {
                        
                        if(KMS_KEY_REGISTER[projectid] != null) {
                            const text = await processKmsDecrypt(projectid, strDataEncrypt);
                            decryptData = text.toLowerCase().indexOf('error') >= 0 ? strDataEncrypt : text;
                        } else {
                            decryptData = strDataEncrypt
                        }
                        
                    }
                    try{
                        data = JSON.parse(decryptData);
                        dbComments = data.comments;
                    }catch(e){
                        console.error(e)    
                    }
                    if(dbComments.length > 0){
                        latestCommentYearly = dbComments[dbComments.length - 1]
                    }
                    latestCommentYearly.totalComments = dbComments.length
                }else{
                    latestCommentYearly.totalComments = 0
                }

                if(deltaReporting[sortidArr[0]] == null){
                    deltaReporting[sortidArr[0]] = []
                }
                deltaReporting[sortidArr[0]].push({"entity": entityid, "location": locationid, "compliance": eventid, "reporter": username,"latest comment": JSON.stringify(latestComment), "latest comment yearly": JSON.stringify(latestCommentYearly)})
                //mmddyyyy + ';' + entityid + ';' + locationid + ';' + eventid
                // assReportsMonthly[mm][sortid] = await reconcileComments(projectid, assReportsMonthly[mm][sortid])
                // assReports[sortid] = assReportsMonthly[mm][sortid]
            }else{
                // if(assReportsMonthly[mm][sortid].length > assReports[sortid]){
                //     assReportsMonthly[mm][sortid] = await reconcileComments(projectid, assReportsMonthly[mm][sortid])
                //     assReports[sortid] = assReportsMonthly[mm][sortid]   
                // }else{
                //     assReports[sortid] = await reconcileComments(projectid, assReports[sortid]);
                //     assReportsMonthly[mm][sortid] = assReports[sortid]
                // }
            }
        }
    }
    console.log('delta', deltaReporting);
    // let putCommand = new PutObjectCommand({
    //     Bucket: BUCKET_NAME,
    //     Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
    //     Body: JSON.stringify(assReports),
    //     ContentType: 'application/json'
    // })
    // try {
    //     await s3Client.send(putCommand);
    // } catch (err) {
    //   console.log('putCommand 1 err', err); 
    // }
    
    // for(let mm of Object.keys(assReportsMonthly)){
    //     putCommand = new PutObjectCommand({
    //         Bucket: BUCKET_NAME,
    //         Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_" + mm + "_enc.json",
    //         Body: JSON.stringify(assReportsMonthly[mm]),
    //         ContentType: 'application/json'
    //     })
    //     try {
    //         await s3Client.send(putCommand);
    //     } catch (err) {
    //       console.log('putCommand err', err); 
    //     }   
    // }

    let putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'reporting_delta_log' + projectid + ".json",
        Body: JSON.stringify(deltaReporting),
        ContentType: 'application/json'
    })
    try {
        await s3Client.send(putCommand);
    } catch (err) {
        console.log('putCommand err', err); 
    }   

    const response = {statusCode: 200, body: {result: true}};
    return response;
}

// async function reconcileComments(projectid, strDataEncrypt){
//     var decryptData;
//     let dbComments = []        
//     if(strDataEncrypt.indexOf("::") >= 0) {
        
//         decryptData = await processDecryptData(projectid, strDataEncrypt);
        
//     } else {
        
//         if(KMS_KEY_REGISTER[projectid] != null) {
//             const text = await processKmsDecrypt(projectid, strDataEncrypt);
//             decryptData = text.toLowerCase().indexOf('error') >= 0 ? strDataEncrypt : text;
//         } else {
//             decryptData = strDataEncrypt
//         }
        
//     }
//     let data = {}
//     try{
//     data = JSON.parse(decryptData);
//     dbComments = data.comments;
//     }catch(e){
//         console.error(e.Code, decryptData)    
//     }
//     let strDataEncryptUpdated = strDataEncrypt;
//     if(data.approved == null){
//         if(dbComments != null && dbComments.length > 1 && dbComments[dbComments.length - 2].author == "Approver"){
//             if(dbComments[dbComments.length - 2].comment.indexOf('(Approved: Yes)') >= 0){
//                 dbComments.push(dbComments.splice(dbComments.length - 2, 1)[0]);
//                 data.approved = true;
//                 data.comments = dbComments
//                 console.log('data changed',data.event?.id)
//                 // var strData = JSON.stringify(data);
//                 // if(KMS_KEY_REGISTER[projectid] != null) {
//                 //     strDataEncryptUpdated = await processEncryptData(projectid, strData);
//                 // } else {
//                 //     strDataEncryptUpdated = strData;
//                 // }
//             }
//         }
//     }
    
//     return strDataEncryptUpdated
// }
