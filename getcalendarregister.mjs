// getcalendar (projectid)


import { REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, PutObjectCommand, BUCKET_NAME, s3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, NUM_ONBOARDING_BACKUPS } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { processEncryptData } from './encryptdata.mjs'

async function getObjectData (projectid, onboardingstep) {
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_' + onboardingstep + '_job_enc.json',
    });
    
    var responseS3;
    var jsonData = {};
    let flagEncryptedNotFound = false
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body; 
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        const jsonContent = JSON.parse(decryptedData);
        jsonData.mappings = jsonContent;
        
    } catch (err) {
      flagEncryptedNotFound = true
    }
    
    if(flagEncryptedNotFound){
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_' + onboardingstep + '_job.json',
        });
        
        responseS3;
        jsonData = {};
        let flagEncryptedNotFound = false
        try {
            const response = await s3Client.send(command);
            const s3ResponseStream = response.Body; 
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            const jsonContent = JSON.parse(responseBuffer.toString());
            jsonData.mappings = jsonContent;
            
        } catch (err) {
            
        }
    }
    
    return jsonData;
    
}

function sort(obj) {
  if (typeof obj !== "object" || Array.isArray(obj))
    return obj;
  const sortedObject = {};
  const keys = Object.keys(obj).sort();
  keys.forEach(key => sortedObject[key] = sort(obj[key]));
  return sortedObject;
}

export const processGetCalendarRegister = async (event) => {
    
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
    
    var projectid = null;
    var year = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        year = JSON.parse(event.body).year;
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
    
    if(year == null) {
        
        year = new Date().getFullYear() + "";
        
    }
    
    let uniqueLocations = []
    
    const jsonFunctionsData = await getObjectData(projectid, 'functions');
    const jsonTagsData = await getObjectData(projectid, 'tags');
    const jsonReportersData = await getObjectData(projectid, 'reporters');
    const jsonApproversData = await getObjectData(projectid, 'approvers');
    const jsonFunctionheadsData = await getObjectData(projectid, 'functionheads');
    const jsonAuditorsData = await getObjectData(projectid, 'auditors');
    const jsonViewersData = await getObjectData(projectid, 'viewers');
    const jsonDocsData = await getObjectData(projectid, 'docs');
    const jsonMakercheckersData = await getObjectData(projectid, 'makercheckers');
    const jsonDuedatesData = await getObjectData(projectid, 'duedates');
    const jsonExtensionsData = await getObjectData(projectid, 'extensions');
    const jsonAlertschedulesData = await getObjectData(projectid, 'alertschedules');
    const jsonActivationsData = await getObjectData(projectid, 'activations');
    const jsonInvalidationsData = await getObjectData(projectid, 'invalidations');
    const jsonTriggersData = await getObjectData(projectid, 'triggers');
    const jsonInternalControlsData = await getObjectData(projectid, 'internalcontrols');
    
    var arrDB = {};
    
    for(var i = 0; i < jsonFunctionsData.mappings.mappings.length; i++) {
        
        var item = jsonFunctionsData.mappings.mappings[i];
        
        const itemTags = jsonTagsData.mappings.mappings[i];
        const itemReporters = jsonReportersData.mappings.mappings[i];
        const itemApprovers = jsonApproversData.mappings.mappings[i];
        const itemFunctionheads = jsonFunctionheadsData.mappings.mappings[i];
        const itemAuditors = jsonAuditorsData.mappings.mappings[i];
        const itemViewers = jsonViewersData.mappings.mappings[i];
        const itemDocs = jsonDocsData.mappings.mappings[i];
        const itemMakercheckers = jsonMakercheckersData.mappings.mappings[i];
        const itemDuedates = jsonDuedatesData.mappings.mappings[i];
        const itemExtensions = jsonExtensionsData.mappings.mappings[i];
        const itemAlertschedules = jsonAlertschedulesData.mappings.mappings[i];
        const itemTriggers = jsonTriggersData.mappings.mappings[i];
        const itemActivations = jsonActivationsData.mappings.mappings[i];
        const itemInvalidations = jsonInvalidationsData.mappings.mappings[i];
        const itemInternalControls = jsonInternalControlsData.mappings.mappings[i];
        
        if(itemTags != null && itemTags.tags != null) {
            item.tags = itemTags.tags;    
            item.delta = itemTags.delta != null ? itemTags.delta : []
            item.lastupdated = itemTags.lastupdated != null ? itemTags.lastupdated : '';
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Tags not In Sync!"}};
            return response;
        }
        if(itemReporters != null && itemReporters.reporters != null) {
            item.reporters = itemReporters.reporters;
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Reporters not In Sync!"}};
            return response;
        }
        if(itemApprovers != null && itemApprovers.approvers != null) {
            item.approvers = itemApprovers.approvers;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Approvers not In Sync!"}};
            return response;
        }
        if(itemFunctionheads != null && itemFunctionheads.functionheads != null) {
            item.functionheads = itemFunctionheads.functionheads;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Functionheads not In Sync!"}};
            return response;
        }
        if(itemAuditors != null && itemAuditors.auditors != null) {
            item.auditors = itemAuditors.auditors;
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Auditors not In Sync!"}};
            return response;
        }
        if(itemViewers != null && itemViewers.viewers != null) {
            item.viewers = itemViewers.viewers;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Viewers not In Sync!"}};
            return response;
        }
        if(itemDocs != null && itemDocs.docs != null) {
            item.docs = itemDocs.docs;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Docs not In Sync!"}};
            return response;
        }
        if(itemMakercheckers != null && itemMakercheckers.makercheckers != null) {
            item.makercheckers = itemMakercheckers.makercheckers;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Makercheckers not In Sync!"}};
            return response;
        }
        if(itemDuedates != null && itemDuedates.duedates != null) {
            item.duedates = itemDuedates.duedates;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Duedates not In Sync!"}};
            return response;
        }
        if(itemExtensions != null && itemExtensions.extensions != null) {
            item.extensions = itemExtensions.extensions;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Extensions not In Sync!"}};
            return response;
        }
        if(itemAlertschedules != null && itemAlertschedules.alertschedules != null) {
            item.alertschedules = itemAlertschedules.alertschedules;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Alertschedules not In Sync!"}};
            return response;
        }
        if(itemTriggers != null && itemTriggers.triggers != null) {
            item.triggers = itemTriggers.triggers;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Triggers not In Sync!"}};
            return response;
        }
        if(itemActivations != null && itemActivations.activations != null) {
            item.activations = itemActivations.activations;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Activations not In Sync!"}};
            return response;
        }
        if(itemInvalidations != null && itemInvalidations.invalidations != null) {
            item.invalidations = itemInvalidations.invalidations;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Invalidations not In Sync!"}};
            return response;
        }
        if(itemInternalControls != null && itemInternalControls.internalcontrols != null) {
            item.internalcontrols = itemInternalControls.internalcontrols;    
        } else {
            const response = {statusCode: 400, body: { result: false, error: "Internalcontrols not In Sync!"}};
            return response;
        }
        
        item.tagsonly = JSON.parse(JSON.stringify(item.tags));
        
        const tags = [];
        tags.push(...item.functions);
        tags.push(...item.tags);
        tags.push(...item.reporters);
        tags.push(...item.approvers);
        tags.push(...item.functionheads);
        tags.push(...item.auditors);
        tags.push(...item.viewers);
        tags.push(...item.docs);
        tags.push(...item.makercheckers);
        tags.push(...item.countries);
        tags.push(...item.entities);
        tags.push(...item.locations);
        
        item.tags = tags;
        
        const jsonDat = JSON.parse(item.data);
        const jsonCols = JSON.parse(item.cols);
        
        jsonCols.push('functions');
        jsonDat.push(item.functions);
        
        jsonCols.push('countryname');
        jsonDat.push(item.countryname);
        jsonCols.push('countryid');
        jsonDat.push(item.countryid);
        
        jsonCols.push('entityname');
        jsonDat.push(item.entityname);
        jsonCols.push('entityid');
        jsonDat.push(item.entityid);
        
        jsonCols.push('locationname');
        jsonDat.push(item.locationname);
        jsonCols.push('locationid');
        jsonDat.push(item.locationid);
        
        jsonCols.push('reporters');
        jsonDat.push(item.reporters);
        jsonCols.push('approvers');
        jsonDat.push(item.approvers);
        
        jsonCols.push('triggers');
        jsonDat.push(item.triggers);
        
        jsonCols.push('delta');
        jsonDat.push(item.delta);
        
        jsonCols.push('lastupdated');
        jsonDat.push(item.lastupdated);
        
        if(!uniqueLocations.includes(item.locationid)) {
            uniqueLocations.push(item.locationid);
        }
        
        if(item.duedates.length > 0) {
            jsonDat[jsonCols.indexOf('duedate')] = item.duedates;
        }
        
        if(item.alertschedules.length > 0) {
            jsonDat[jsonCols.indexOf('alertschedule')] = item.alertschedules;
        }
        
        if(item.activations.length > 0) {
            jsonDat[jsonCols.indexOf('activations')] = item.activations;
        }
        
        if(item.invalidations.length > 0) {
            jsonDat[jsonCols.indexOf('invalidations')] = item.invalidations;
        }
        
        if(item.internalcontrols.length > 0) {
            jsonDat[jsonCols.indexOf('internalcontrols')] = item.internalcontrols
        }
        
        if(item.triggers.trim().length > 0) {
            console.log('item.triggers', `"${item.triggers}"`)
            var arrTriggers = JSON.parse(item.triggers); 
            
            for(j = 0; j < arrTriggers.length; j++) {
                
                const trigger = arrTriggers[j];
                var tempDuedate = jsonDat[jsonCols.indexOf('duedate')];
                tempDuedate += ("," + trigger.targetDates.join(","))
                if(j < arrTriggers.length - 1) {
                    tempDuedate += ",";
                }
                jsonDat[jsonCols.indexOf('duedate')] = tempDuedate;
                
            }
        
        }
        
        item.data = JSON.stringify(jsonDat);
        item.cols = JSON.stringify(jsonCols);
        
        var statute = "";
        for(var j = 0; j < jsonCols.length; j++) {
            if(jsonCols[j] == "statute") {
                statute = (jsonDat[j] + "").trim();
            }
        }
        
        const countryname = item.countryname.replace(/ *\([^)]*\) */g, "");
        
        if(arrDB[countryname] == null) {
            arrDB[countryname] = {};
        }
        if(arrDB[countryname][statute] == null) {
            arrDB[countryname][statute] = {};
        }
        if(arrDB[countryname][statute][item.id] == null) {
            arrDB[countryname][statute][item.id] = [];
        }
        
        arrDB[countryname][statute][item.id].push(item);
        
    }

    const ordered = sort(arrDB);
    
    for(var k = 0; k < Object.keys(ordered).length; k++) {
        
        const country = Object.keys(ordered)[k];
        ordered[country] = sort(ordered[country]);
        
    }
    let encryptedData = await processEncryptData(projectid, JSON.stringify(ordered))
    let command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_calendar_db_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    let responseS3;
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
    }
    
    const response = {statusCode: 200, body: {result: true}};
    return response;
    
}