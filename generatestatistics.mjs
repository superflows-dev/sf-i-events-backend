import { processAuthenticate } from './authenticate.mjs'
import { s3Client, BUCKET_NAME, BUCKET_FOLDER_REPORTING, GetObjectCommand, PutObjectCommand, CALENDAR_PROCESS_BLOCK_SIZE, KMS_KEY_REGISTER, BUCKET_FOLDER_STATISTICS } from './globals.mjs'
import { processDecryptData } from './decryptdata.mjs'
import { processEncryptData } from './encryptdata.mjs'
import { processKmsDecrypt } from './kmsdecrypt.mjs'
import { processGetCompletenessStatus } from './getcompletenessstatus.mjs'
import { processSendEmail } from './sendemail.mjs'
export const processGenerateStatistics = async (event) => {
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
    var year = null;
    var userid = null;
    var role = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        year = JSON.parse(event.body).year;
        userid = JSON.parse(event.body).userid;
        role = JSON.parse(event.body).role;
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
    
    let userFileKey = projectid + '_' + userid + '_' + year + '_' + role +'_calendar_job_enc.json'
    let flagUserFileNotFound = false;
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: userFileKey,
    });
    
    let responseS3;
    let storedCalendar = {}
    try {
        responseS3 = await s3Client.send(command);
        const s3ResponseStream = responseS3.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        storedCalendar = JSON.parse(decryptedData);
        
    } catch (err) {
      console.log(err);
    }
    
    let assReports = {};
    
    command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: BUCKET_FOLDER_REPORTING + '/' + projectid + "_reporting_enc.json",
    });
    
    responseS3;
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
    let arrStatistics = {}
    let arrStatisticsMeta = {}
    let arrStatisticsUsers = {}
    let arrStatisticsFunctions = {}
    let arrStatisticsLocations = {}
    for(var i = 0; (i < Object.keys(storedCalendar).length); i++) {
        
        const mmddyyyy = Object.keys(storedCalendar)[i];
        
        if(mmddyyyy == "00/00") continue;
        // console.log('mmddyyyy', mmddyyyy)
        // const mm = mmddyyyy.split('/')[0];
        // const dd = mmddyyyy.split('/')[1];
        // const yyyy = mmddyyyy.split('/')[2];
        
        
        var entity = "";
        var entities = Object.keys(storedCalendar[mmddyyyy]);;
        var locations = [];
           
        for(var k = 0; k < entities.length; k++) {
            // 
            entity = entities[k];
            
            // console.log('entity', entity);
        
            
            if(entity.length === 36) {
                locations = Object.keys(storedCalendar[mmddyyyy][entity]);
                // console.log('locations', locations);
                
                for(var j = 0; j < locations.length; j++) {
            
                    const events = storedCalendar[mmddyyyy][entity][locations[j]];
                    // console.log('events', mmddyyyy, entity, locations[j]) ;
                    if(events == null){
                        continue
                    }
                    for(var l = 0; l < events.length; l++) {
                        
                        if(assReports[mmddyyyy + ';' + events[l].entityid + ';' + events[l].locationid + ';' + events[l].id] != null) {
                                
                            var strData = assReports[mmddyyyy + ';' + events[l].entityid + ';' + events[l].locationid + ';' + events[l].id];
                            
                            if(strData.indexOf("::") >= 0) {
                                
                                strData = await processDecryptData(projectid, strData);

                                try{                                            
                                    const jsonData = JSON.parse(strData);
                                    
                                    // console.log('jsonData',jsonData, mmddyyyy)    
                                    events[l].documents = JSON.parse(jsonData.docs ?? "[]");
                                    events[l].comments = jsonData.comments;
                                    events[l].approved = jsonData.approved;
                                    events[l].lastupdated = jsonData.lastupdated;
                                    events[l].dateofcompletion = jsonData.dateofcompletion;
                                    
                                    if(jsonData.event != null) {
                                        events[l].reportevent = jsonData.event;
                                    }
                                    
                                    if((mmddyyyy + ';' + entity + ';' + locations[j] + ';' + events[l].id) == "06/30/2024;c989a44e-7d3d-427e-b712-90eacf585075;38dc8c53-643f-4fee-83fe-f15239606277;362e0260-b0bf-41f9-9788-a7f680de1c3b") {
                                        // console.log(events[l].comments);
                                    }
                                }catch(e){
                                    events[l].documents = [];
                                    events[l].comments = [];
                                    events[l].approved = false;
                                    events[l].lastupdated = "";
                                    events[l].dateofcompletion = "";
                                }
                                
                                
                            } else {
                                
                                if(strData.indexOf('equal to 4096') >= 0) {
                                    events[l].documents = [];
                                    events[l].comments = [];
                                    events[l].approved = false;
                                    events[l].lastupdated = "";
                                    events[l].dateofcompletion = "";
                                    
                                } else {
                                    
                                    if(KMS_KEY_REGISTER[projectid] != null) {
                                    
                                        let text;
                                        if(isJsonString(strData)){
                                            text = strData;
                                        }else{
                                            text = await processKmsDecrypt(projectid, strData);
                                        }
                                        // console.log('inside register', text, strData);
                                        strData = text.indexOf('Exception') >= 0 ? strData : text;
                                        
                                    }
                                    
                                    const jsonData = JSON.parse(strData);
                                    
                                    events[l].documents = JSON.parse(jsonData.docs ?? "[]");
                                    events[l].comments = jsonData.comments;
                                    events[l].approved = jsonData.approved;
                                    events[l].lastupdated = jsonData.lastupdated;
                                    events[l].dateofcompletion = jsonData.dateofcompletion;
                                    if(jsonData.event != null) {
                                        events[l].reportevent = jsonData.event;
                                    }
                                    
                                    
                                    
                                }
                                
                            }
                            
                            
                        } else {
                            
                            events[l].documents = [];
                            events[l].comments = [];
                            events[l].approved = false;
                            events[l].lastupdated = "";
                            events[l].dateofcompletion = "";
                            
                        }
                        
                        events[l].completenessstatus = processGetCompletenessStatus(events[l]);
                        if(events[l].id == '29eb874a-27e5-4be8-a79d-4365c20271ad'){
                            // console.log('completenessstatus', events[l].completenessstatus, mmddyyyy + ';' + events[l].entityid + ';' + events[l].locationid + ';' + events[l].id)
                        }
                        if(arrStatistics[mmddyyyy] == null) {
                            arrStatistics[mmddyyyy] = {
                                count: 0
                            }
                        }
                        arrStatistics[mmddyyyy].count++;
                        if(arrStatistics[mmddyyyy][events[l].completenessstatus] == null){
                            arrStatistics[mmddyyyy][events[l].completenessstatus] = 0
                        }
                        arrStatistics[mmddyyyy][events[l].completenessstatus]++
                        if(arrStatisticsMeta['subfilters'] == null){
                            arrStatisticsMeta['subfilters'] = {}
                        }
                        if(arrStatisticsMeta['subfilters']['risks'] == null){
                            arrStatisticsMeta['subfilters']['risks'] = []
                        }
                        for(let risk of events[l].risk){
                            if(arrStatisticsMeta['subfilters']['risks'].indexOf(risk) < 0){
                                arrStatisticsMeta['subfilters']['risks'].push(risk)
                            }
                            if(arrStatistics['subfilters'] == null){
                                arrStatistics['subfilters'] = {}
                            }
                            if(arrStatistics['subfilters'][risk] == null){
                                arrStatistics['subfilters'][risk] = {}
                            }
                            if(arrStatistics['subfilters'][risk][mmddyyyy] == null) {
                                arrStatistics['subfilters'][risk][mmddyyyy] = {
                                    count: 0
                                }
                            } 
                            arrStatistics['subfilters'][risk][mmddyyyy].count++;
                            if(arrStatistics['subfilters'][risk][mmddyyyy][events[l].completenessstatus] == null){
                                arrStatistics['subfilters'][risk][mmddyyyy][events[l].completenessstatus] = 0
                            }
                            arrStatistics['subfilters'][risk][mmddyyyy][events[l].completenessstatus]++  
                        }
                        if(arrStatisticsMeta['reporter'] == null){
                               arrStatisticsMeta['reporter'] = []
                        }
                        for(let reporter of events[l].reporters){
                            let reporterid = reporter.split(';')[1]
                            if(arrStatisticsMeta['reporter'].indexOf(reporter) < 0) {
                                arrStatisticsMeta['reporter'].push(reporter)
                            }
                            if(arrStatisticsUsers['reporter'] == null){
                                arrStatisticsUsers['reporter'] = {}
                            }
                            if(arrStatisticsUsers['reporter'][reporterid] == null){
                                arrStatisticsUsers['reporter'][reporterid] = {}
                            }
                            if(arrStatisticsUsers['reporter'][reporterid][mmddyyyy] == null) {
                                arrStatisticsUsers['reporter'][reporterid][mmddyyyy] = {
                                    count: 0
                                }
                            }
                            
                            arrStatisticsUsers['reporter'][reporterid][mmddyyyy].count++;
                            if(arrStatisticsUsers['reporter'][reporterid][mmddyyyy][events[l].completenessstatus] == null){
                                arrStatisticsUsers['reporter'][reporterid][mmddyyyy][events[l].completenessstatus] = 0
                            }
                            arrStatisticsUsers['reporter'][reporterid][mmddyyyy][events[l].completenessstatus]++

                            if(arrStatisticsUsers['reporter'][reporterid]['subfilters'] == null){
                                arrStatisticsUsers['reporter'][reporterid]['subfilters'] = {}
                            }
                            if(arrStatisticsMeta['subfilters'] == null){
                                arrStatisticsMeta['subfilters'] = {}
                            }
                            if(arrStatisticsMeta['subfilters']['risks'] == null){
                                arrStatisticsMeta['subfilters']['risks'] = []
                            }
                            for(let risk of events[l].risk){
                                if(arrStatisticsMeta['subfilters']['risks'].indexOf(risk) < 0){
                                    arrStatisticsMeta['subfilters']['risks'].push(risk)
                                }
                                if(arrStatisticsUsers['reporter'][reporterid]['subfilters'] == null){
                                    arrStatisticsUsers['reporter'][reporterid]['subfilters'] = {}
                                }
                                if(arrStatisticsUsers['reporter'][reporterid]['subfilters'][risk] == null){
                                    arrStatisticsUsers['reporter'][reporterid]['subfilters'][risk] = {}
                                }
                                if(arrStatisticsUsers['reporter'][reporterid]['subfilters'][risk][mmddyyyy] == null) {
                                    arrStatisticsUsers['reporter'][reporterid]['subfilters'][risk][mmddyyyy] = {
                                        count: 0
                                    }
                                } 
                                arrStatisticsUsers['reporter'][reporterid]['subfilters'][risk][mmddyyyy].count++;
                                if(arrStatisticsUsers['reporter'][reporterid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] == null){
                                    arrStatisticsUsers['reporter'][reporterid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] = 0
                                }
                                arrStatisticsUsers['reporter'][reporterid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus]++  
                            }
                        }
                        
                        if(arrStatisticsMeta['approver'] == null){
                            arrStatisticsMeta['approver'] = []
                        }
                        for(let approver of events[l].approvers){
                            let approverid = approver.split(';')[1]
                            if(arrStatisticsMeta['approver'].indexOf(approver) < 0) {
                                arrStatisticsMeta['approver'].push(approver)
                            }
                            if(arrStatisticsUsers['approver'] == null){
                                arrStatisticsUsers['approver'] = {}
                            }
                            if(arrStatisticsUsers['approver'][approverid] == null){
                                arrStatisticsUsers['approver'][approverid] = {}
                            }
                            if(arrStatisticsUsers['approver'][approverid][mmddyyyy] == null) {
                                arrStatisticsUsers['approver'][approverid][mmddyyyy] = {
                                    count: 0
                                }
                            }
                            arrStatisticsUsers['approver'][approverid][mmddyyyy].count++;
                            if(arrStatisticsUsers['approver'][approverid][mmddyyyy][events[l].completenessstatus] == null){
                                arrStatisticsUsers['approver'][approverid][mmddyyyy][events[l].completenessstatus] = 0
                            }
                            arrStatisticsUsers['approver'][approverid][mmddyyyy][events[l].completenessstatus]++

                            if(arrStatisticsMeta['subfilters'] == null){
                                arrStatisticsMeta['subfilters'] = {}
                            }
                            if(arrStatisticsMeta['subfilters']['risks'] == null){
                                arrStatisticsMeta['subfilters']['risks'] = []
                            }
                            for(let risk of events[l].risk){
                                if(arrStatisticsMeta['subfilters']['risks'].indexOf(risk) < 0){
                                    arrStatisticsMeta['subfilters']['risks'].push(risk)
                                }
                                if(arrStatisticsUsers['approver'][approverid]['subfilters'] == null) {
                                    arrStatisticsUsers['approver'][approverid]['subfilters'] = {}
                                }
                                if(arrStatisticsUsers['approver'][approverid]['subfilters'][risk] == null){
                                    arrStatisticsUsers['approver'][approverid]['subfilters'][risk] = {}
                                }
                                if(arrStatisticsUsers['approver'][approverid]['subfilters'][risk][mmddyyyy] == null) {
                                    arrStatisticsUsers['approver'][approverid]['subfilters'][risk][mmddyyyy] = {
                                        count: 0
                                    }
                                } 
                                arrStatisticsUsers['approver'][approverid]['subfilters'][risk][mmddyyyy].count++;
                                if(arrStatisticsUsers['approver'][approverid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] == null){
                                    arrStatisticsUsers['approver'][approverid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] = 0
                                }
                                arrStatisticsUsers['approver'][approverid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus]++  
                            }
                        }
                        
                        if(arrStatisticsMeta['functionhead'] == null){
                            arrStatisticsMeta['functionhead'] = []
                        }
                        for(let functionhead of events[l].functionheads){
                            let functionheadid = functionhead.split(';')[1]
                            if(arrStatisticsMeta['functionhead'].indexOf(functionhead) < 0) {
                                arrStatisticsMeta['functionhead'].push(functionhead)
                            }
                            if(arrStatisticsUsers['functionhead'] == null){
                                arrStatisticsUsers['functionhead'] = {}
                            }
                            if(arrStatisticsUsers['functionhead'][functionheadid] == null){
                                arrStatisticsUsers['functionhead'][functionheadid] = {}
                            }
                            if(arrStatisticsUsers['functionhead'][functionheadid][mmddyyyy] == null) {
                                arrStatisticsUsers['functionhead'][functionheadid][mmddyyyy] = {
                                    count: 0
                                }
                            }
                            arrStatisticsUsers['functionhead'][functionheadid][mmddyyyy].count++;
                            if(arrStatisticsUsers['functionhead'][functionheadid][mmddyyyy][events[l].completenessstatus] == null){
                                arrStatisticsUsers['functionhead'][functionheadid][mmddyyyy][events[l].completenessstatus] = 0
                            }
                            arrStatisticsUsers['functionhead'][functionheadid][mmddyyyy][events[l].completenessstatus]++

                            if(arrStatisticsMeta['subfilters'] == null){
                                arrStatisticsMeta['subfilters'] = {}
                            }
                            if(arrStatisticsMeta['subfilters']['risks'] == null){
                                arrStatisticsMeta['subfilters']['risks'] = []
                            }
                            for(let risk of events[l].risk){
                                if(arrStatisticsMeta['subfilters']['risks'].indexOf(risk) < 0){
                                    arrStatisticsMeta['subfilters']['risks'].push(risk)
                                }
                                if(arrStatisticsUsers['functionhead'][functionheadid]['subfilters'] == null){
                                    arrStatisticsUsers['functionhead'][functionheadid]['subfilters'] = {}
                                }
                                if(arrStatisticsUsers['functionhead'][functionheadid]['subfilters'][risk] == null){
                                    arrStatisticsUsers['functionhead'][functionheadid]['subfilters'][risk] = {}
                                }
                                if(arrStatisticsUsers['functionhead'][functionheadid]['subfilters'][risk][mmddyyyy] == null) {
                                    arrStatisticsUsers['functionhead'][functionheadid]['subfilters'][risk][mmddyyyy] = {
                                        count: 0
                                    }
                                } 
                                arrStatisticsUsers['functionhead'][functionheadid]['subfilters'][risk][mmddyyyy].count++;
                                if(arrStatisticsUsers['functionhead'][functionheadid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] == null){
                                    arrStatisticsUsers['functionhead'][functionheadid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] = 0
                                }
                                arrStatisticsUsers['functionhead'][functionheadid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus]++  
                            }
                        }
                        
                        if(arrStatisticsMeta['function'] == null){
                            arrStatisticsMeta['function'] = []
                        }
                        for(let functionname of events[l].functions){
                            
                            let functionid = functionname.split(';')[1]
                            if(functionname.indexOf("Legal") >= 0){
                                console.log('legal', functionname, events[l].id, events[l].locationname, mmddyyyy, functionid, events[l].completenessstatus)
                            }
                            if(arrStatisticsMeta['function'].indexOf(functionname) < 0){
                                arrStatisticsMeta['function'].push(functionname)
                            }
                            if(arrStatisticsFunctions[functionid] == null){
                                arrStatisticsFunctions[functionid] = {}
                            }
                            if(arrStatisticsFunctions[functionid][mmddyyyy] == null) {
                                arrStatisticsFunctions[functionid][mmddyyyy] = {
                                    count: 0
                                }
                            }
                            arrStatisticsFunctions[functionid][mmddyyyy].count++;
                            if(arrStatisticsFunctions[functionid][mmddyyyy][events[l].completenessstatus] == null){
                                arrStatisticsFunctions[functionid][mmddyyyy][events[l].completenessstatus] = 0
                            }
                            arrStatisticsFunctions[functionid][mmddyyyy][events[l].completenessstatus]++
                            
                            if(arrStatisticsMeta['subfilters'] == null){
                                arrStatisticsMeta['subfilters'] = {}
                            }
                            if(arrStatisticsMeta['subfilters']['risks'] == null){
                                arrStatisticsMeta['subfilters']['risks'] = []
                            }
                            for(let risk of events[l].risk){
                                if(arrStatisticsMeta['subfilters']['risks'].indexOf(risk) < 0){
                                    arrStatisticsMeta['subfilters']['risks'].push(risk)
                                }
                                if(arrStatisticsFunctions[functionid]['subfilters'] == null){
                                    arrStatisticsFunctions[functionid]['subfilters'] = {}
                                }
                                if(arrStatisticsFunctions[functionid]['subfilters'][risk] == null){
                                    arrStatisticsFunctions[functionid]['subfilters'][risk] = {}
                                }
                                if(arrStatisticsFunctions[functionid]['subfilters'][risk][mmddyyyy] == null) {
                                    arrStatisticsFunctions[functionid]['subfilters'][risk][mmddyyyy] = {
                                        count: 0
                                    }
                                } 
                                arrStatisticsFunctions[functionid]['subfilters'][risk][mmddyyyy].count++;
                                if(arrStatisticsFunctions[functionid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] == null){
                                    arrStatisticsFunctions[functionid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] = 0
                                }
                                arrStatisticsFunctions[functionid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus]++  
                            }
                        }
                        
                        if(arrStatisticsMeta['location'] == null){
                            arrStatisticsMeta['location'] = []
                        }
                        if(arrStatisticsMeta['location'].indexOf(events[l].locationname + ';' + events[l].locationid) < 0){
                            arrStatisticsMeta['location'].push(events[l].locationname + ';' + events[l].locationid)
                        }
                        if(arrStatisticsLocations[events[l].locationid] == null){
                            arrStatisticsLocations[events[l].locationid] = {}
                        }
                        if(arrStatisticsLocations[events[l].locationid][mmddyyyy] == null) {
                            arrStatisticsLocations[events[l].locationid][mmddyyyy] = {
                                count: 0
                            }
                        }
                        arrStatisticsLocations[events[l].locationid][mmddyyyy].count++;
                        if(arrStatisticsLocations[events[l].locationid][mmddyyyy][events[l].completenessstatus] == null){
                            arrStatisticsLocations[events[l].locationid][mmddyyyy][events[l].completenessstatus] = 0
                        }
                        arrStatisticsLocations[events[l].locationid][mmddyyyy][events[l].completenessstatus]++

                        if(arrStatisticsMeta['subfilters'] == null){
                            arrStatisticsMeta['subfilters'] = {}
                        }
                        if(arrStatisticsMeta['subfilters']['risks'] == null){
                            arrStatisticsMeta['subfilters']['risks'] = []
                        }
                        for(let risk of events[l].risk){
                            if(arrStatisticsMeta['subfilters']['risks'].indexOf(risk) < 0){
                                arrStatisticsMeta['subfilters']['risks'].push(risk)
                            }
                            if(arrStatisticsLocations[events[l].locationid]['subfilters'] == null){
                                arrStatisticsLocations[events[l].locationid]['subfilters'] = {}
                            }
                            if(arrStatisticsLocations[events[l].locationid]['subfilters'][risk] == null){
                                arrStatisticsLocations[events[l].locationid]['subfilters'][risk] = {}
                            }
                            if(arrStatisticsLocations[events[l].locationid]['subfilters'][risk][mmddyyyy] == null) {
                                arrStatisticsLocations[events[l].locationid]['subfilters'][risk][mmddyyyy] = {
                                    count: 0
                                }
                            } 
                            arrStatisticsLocations[events[l].locationid]['subfilters'][risk][mmddyyyy].count++;
                            if(arrStatisticsLocations[events[l].locationid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] == null){
                                arrStatisticsLocations[events[l].locationid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus] = 0
                            }
                            arrStatisticsLocations[events[l].locationid]['subfilters'][risk][mmddyyyy][events[l].completenessstatus]++  
                        }
                    }
                }
            }
        }
    }
    
    arrStatistics['filtersdata'] = {}
    for(let rolestr of Object.keys(arrStatisticsUsers)){
        arrStatistics['filtersdata'][rolestr] = arrStatisticsUsers[rolestr]
    }
    arrStatistics['filtersdata']['function'] = arrStatisticsFunctions
    arrStatistics['filtersdata']['location'] = arrStatisticsLocations
    
    let encryptedData = await processEncryptData(projectid, JSON.stringify(arrStatistics))
    command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_all_enc.json',
        Body: encryptedData,
        ContentType: 'application/json'
    })
    try{
        await s3Client.send(command)
        
    }catch(e){
        console.log('write err1', e)
    }
    
    encryptedData = await processEncryptData(projectid, JSON.stringify(arrStatisticsMeta))
    command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_meta_enc.json',
        Body: encryptedData,
        ContentType: 'application/json'
    })
    try{
        await s3Client.send(command)
        console.log('meta', JSON.stringify(arrStatisticsMeta));
    }catch(e){
        console.log('write err2', e)
    }
    
    for(let userrole of Object.keys(arrStatisticsUsers)){
        for(let userprofileid of Object.keys(arrStatisticsUsers[userrole])){
            encryptedData = await processEncryptData(projectid, JSON.stringify(arrStatisticsUsers[userrole][userprofileid]))
            command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_' + userrole + '_' + userprofileid + '_enc.json',
                Body: encryptedData,
                ContentType: 'application/json'
            })
            try{
                await s3Client.send(command)
            }catch(e){
                console.log('write err1', e)
            }
        }
    }
    
    for(let functionid of Object.keys(arrStatisticsFunctions)){
        encryptedData = await processEncryptData(projectid, JSON.stringify(arrStatisticsFunctions[functionid]))
        command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_function_' + functionid + '_enc.json',
            Body: encryptedData,
            ContentType: 'application/json'
        })
        try{
            await s3Client.send(command)
        }catch(e){
            console.log('write err1', e)
        }
    }
    for(let locationid of Object.keys(arrStatisticsLocations)){
        encryptedData = await processEncryptData(projectid, JSON.stringify(arrStatisticsLocations[locationid]))
        command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_location_' + locationid + '_enc.json',
            Body: encryptedData,
            ContentType: 'application/json'
        })
        try{
            await s3Client.send(command)
        }catch(e){
            console.log('write err1', e)
        }
    }
    
    let htmlBody = "Statistics Generated for - " + projectid + " - " + userid
    let subject = "Statistics Generation done - " + projectid
    await processSendEmail("hrushi@flagggrc.tech,ninad.t@flagggrc.tech", subject, '', htmlBody)
    const response = {statusCode: 200, body: {result: true}};
    return response;
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}