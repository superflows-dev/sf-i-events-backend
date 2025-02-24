// getcalendar (projectid)


import { REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, PutObjectCommand, BUCKET_NAME, s3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, NUM_ONBOARDING_BACKUPS } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { processEncryptData } from './encryptdata.mjs'
function isNumeric(str) { 
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

const lastDayOfMonth = (yyyy, mm) => {
    
    var date = [31,28,31,30,31,30,31,31,30,31,30,31][mm - 1];
    
    if(yyyy%4 === 0) {
        if(mm === 2) {
            date = 29;
        }
    }
    
    return date;
    
}

const getFincalFromMonth = (mm, yyyy) => {
    
    var currMonth = (new Date().getMonth() + 1);
        
    if(parseInt(mm) >= 4 && parseInt(mm) <= 12) {
        
        if(currMonth >= 4 && currMonth <= 12) {
            return yyyy;
        } else {
            return (parseInt(yyyy) - 1);
        }
        
    } else {
        
        if(currMonth >= 4 && currMonth <= 12) {
            return (parseInt(yyyy) + 1);
        } else {
            return parseInt(yyyy);
        }
        
    }
    
}

const pushEvent = (arrEvents, mmddyyyy, item, contractStartDate) => {
    
    if(contractStartDate != null) {
    
        var arrContractStartDate = contractStartDate.split('/');
        var contractStartDateDD = arrContractStartDate[0];
        var contractStartDateMM = arrContractStartDate[1];
        var contractStartDateYYYY = arrContractStartDate[2];
        
        var arrMMDDYYYYs = mmddyyyy.split('/');
        var mmddyyyyMM = arrMMDDYYYYs[0];
        var mmddyyyyDD = arrMMDDYYYYs[1];
        var mmddyyyyYYYY = arrMMDDYYYYs[2];
        
        var contractStartTs = new Date(contractStartDateYYYY, contractStartDateMM, contractStartDateDD).getTime();
        var eventTs = new Date(mmddyyyyYYYY, mmddyyyyMM, mmddyyyyDD).getTime();
        
        if(eventTs < contractStartTs) {
            return arrEvents;
        }
    
    }
    
    if(arrEvents[item.locationid] == null) {
        arrEvents[item.locationid] = {}    
    }
    
    if(arrEvents[item.locationid][mmddyyyy] == null) {
        arrEvents[item.locationid][mmddyyyy] = {}    
    }
    
    if(arrEvents[item.locationid][mmddyyyy][item.entityid] == null) {
        arrEvents[item.locationid][mmddyyyy][item.entityid] = {}    
    }
    
    if(arrEvents[item.locationid][mmddyyyy][item.entityid][item.locationid] == null) {
        arrEvents[item.locationid][mmddyyyy][item.entityid][item.locationid] = []    
    }
    
    if(item.extensions.trim().length > 0) {
        
        const extensions = JSON.parse(item.extensions);
        for(var i = 0; i < extensions.length; i++) {
            
            const mmddyyyyStart = extensions[i].split('-')[0].trim();
            const mmddyyyyEnd = extensions[i].split('-')[1].trim();
            
            if(mmddyyyyStart == mmddyyyy) {
                
                return pushEvent(arrEvents, mmddyyyyEnd, item, contractStartDate);
                
            }
            
        }
    }
    
    const jsonData1 = JSON.parse(item.data);
    const jsonCols = JSON.parse(item.cols);
    
    var jsonCompliance = {};
    
    for(var i = 0; i < jsonCols.length; i++) {
        jsonCompliance[jsonCols[i]] = jsonData1[i];
    }
    
    jsonCompliance.id = item.id;
    
    var itemToBeAdded = {};
    
    for(i = 0; i < Object.keys(jsonCompliance).length; i++) {
        itemToBeAdded[Object.keys(jsonCompliance)[i]] = jsonCompliance[Object.keys(jsonCompliance)[i]];
    }
    
    itemToBeAdded.id = item.id;
    
    itemToBeAdded.delta = item.delta;
    itemToBeAdded.lastupdated = item.lastupdated;
    itemToBeAdded.countries = item.countries;
    itemToBeAdded.entities = item.entities;
    itemToBeAdded.locations = item.locations;
    itemToBeAdded.reporters = item.reporters;
    itemToBeAdded.approvers = item.approvers;
    itemToBeAdded.functionheads = item.functionheads;
    itemToBeAdded.auditors = item.auditors;
    itemToBeAdded.viewers = item.viewers;
    itemToBeAdded.docs = item.docs;
    itemToBeAdded.makercheckers = item.makercheckers;
    itemToBeAdded.triggers = item.triggers;
    itemToBeAdded.tags = item.tags;
    itemToBeAdded.tagsmap = {};
    itemToBeAdded.reportersmap = {};
    itemToBeAdded.approversmap = {};
    itemToBeAdded.functionheadsmap = {};
    itemToBeAdded.auditorsmap = {};
    itemToBeAdded.viewersmap = {};
    
    for(i = 0; i < itemToBeAdded.tags.length; i++) {
        
        itemToBeAdded.tagsmap[itemToBeAdded.tags[i].split(';')[1]] = true;
        
    }
    
    
    for(i = 0; i < itemToBeAdded.reporters.length; i++) {
        
        itemToBeAdded.reportersmap[itemToBeAdded.reporters[i].split(';')[1]] = true;
        
    }
    
    
    for(i = 0; i < itemToBeAdded.approvers.length; i++) {
        
        itemToBeAdded.approversmap[itemToBeAdded.approvers[i].split(';')[1]] = true;
        
    }


    for(i = 0; i < itemToBeAdded.functionheads.length; i++) {
        
        itemToBeAdded.functionheadsmap[itemToBeAdded.functionheads[i].split(';')[1]] = true;
        
    }
    
    
    for(i = 0; i < itemToBeAdded.auditors.length; i++) {
        
        itemToBeAdded.auditorsmap[itemToBeAdded.auditors[i].split(';')[1]] = true;
        
    }

    for(i = 0; i < itemToBeAdded.viewers.length; i++) {
        
        itemToBeAdded.viewersmap[itemToBeAdded.viewers[i].split(';')[1]] = true;
        
    } 
    
    itemToBeAdded.countryname = item.countryname;
    itemToBeAdded.countryid = item.countryid;
    itemToBeAdded.locationname = item.locationname;
    itemToBeAdded.locationid = item.locationid;
    itemToBeAdded.entityname = item.entityname;
    itemToBeAdded.entityid = item.entityid;
    
    
    const arrMMDDYYYY = mmddyyyy.split('/');
    itemToBeAdded.duedate = arrMMDDYYYY[1] + "/" + arrMMDDYYYY[0] + "/" + arrMMDDYYYY[2];
 
    arrEvents[item.locationid][mmddyyyy][item.entityid][item.locationid].push(itemToBeAdded);
    if(arrEvents[item.locationid][mmddyyyy]['locations'] == null) {
       arrEvents[item.locationid][mmddyyyy]['locations'] = {}; 
    }
    if(arrEvents[item.locationid][mmddyyyy]['locations'][item.locationid] == null) {
       arrEvents[item.locationid][mmddyyyy]['locations'][item.locationid] = item.entityid; 
    }
    if(arrEvents[item.locationid][mmddyyyy]['countries'] == null) {
       arrEvents[item.locationid][mmddyyyy]['countries'] = {}; 
    }
    if(arrEvents[item.locationid][mmddyyyy]['countries'][item.countryid] == null) {
       arrEvents[item.locationid][mmddyyyy]['countries'][item.countryid] = item.entityid; 
    }
    if(arrEvents[item.locationid][mmddyyyy]['tags'] == null) {
       arrEvents[item.locationid][mmddyyyy]['tags'] = {}; 
    }
    for(i = 0; i < itemToBeAdded.tags.length; i++) {
        arrEvents[item.locationid][mmddyyyy]['tags'][itemToBeAdded.tags[i].split(';')[1]] = true;
    }
    
    return arrEvents;
    
}

const pushEventTag = (arrTagsEvents, mmddyyyy, item, contractStartDate) => {
    
    if(contractStartDate != null) {
    
        var arrContractStartDate = contractStartDate.split('/');
        var contractStartDateDD = arrContractStartDate[0];
        var contractStartDateMM = arrContractStartDate[1];
        var contractStartDateYYYY = arrContractStartDate[2];
        
        var arrMMDDYYYYs = mmddyyyy.split('/');
        var mmddyyyyMM = arrMMDDYYYYs[0];
        var mmddyyyyDD = arrMMDDYYYYs[1];
        var mmddyyyyYYYY = arrMMDDYYYYs[2];
        
        var contractStartTs = new Date(contractStartDateYYYY, contractStartDateMM, contractStartDateDD).getTime();
        var eventTs = new Date(mmddyyyyYYYY, mmddyyyyMM, mmddyyyyDD).getTime();
        
        if(eventTs < contractStartTs) {
            
            console.log('arrTagsEvents', arrTagsEvents);
            
            return arrTagsEvents;
        }
    
    }
    
    for(var k = 0 ; k < item.tagsonly.length; k++){
        // console.log('item tag', item.tagsonly[i])
        const tagArr = item.tagsonly[k].split(";")
        const tagName = tagArr[0]
        const tagId = tagArr[1]
        
        if(arrTagsEvents[tagId] == null) {
            arrTagsEvents[tagId] = {}    
        }
        if(arrTagsEvents[tagId][mmddyyyy] == null) {
            arrTagsEvents[tagId][mmddyyyy] = {}    
        }
        
        if(arrTagsEvents[tagId][mmddyyyy][item.entityid] == null) {
            arrTagsEvents[tagId][mmddyyyy][item.entityid] = {}    
        }
        
        if(arrTagsEvents[tagId][mmddyyyy][item.entityid][item.locationid] == null) {
            arrTagsEvents[tagId][mmddyyyy][item.entityid][item.locationid] = []    
        }
        
        if(item.extensions.trim().length > 0) {
        
            const extensions = JSON.parse(item.extensions);
            for(var i = 0; i < extensions.length; i++) {
                
                const mmddyyyyStart = extensions[i].split('-')[0].trim();
                const mmddyyyyEnd = extensions[i].split('-')[1].trim();
                
                if(mmddyyyyStart == mmddyyyy) {
                    
                    return pushEventTag(arrTagsEvents, mmddyyyyEnd, item, contractStartDate);
                    
                }
                
            }
        }
        
        const jsonData1 = JSON.parse(item.data);
        const jsonCols = JSON.parse(item.cols);
        
        var jsonCompliance = {};
        
        for(var i = 0; i < jsonCols.length; i++) {
            jsonCompliance[jsonCols[i]] = jsonData1[i];
        }
        
        jsonCompliance.id = item.id;
        
        var itemToBeAdded = {};
        
        for(i = 0; i < Object.keys(jsonCompliance).length; i++) {
            itemToBeAdded[Object.keys(jsonCompliance)[i]] = jsonCompliance[Object.keys(jsonCompliance)[i]];
        }
        
        itemToBeAdded.id = item.id;
        
        itemToBeAdded.delta = item.delta;
        itemToBeAdded.lastupdated = item.lastupdated;
        itemToBeAdded.countries = item.countries;
        itemToBeAdded.entities = item.entities;
        itemToBeAdded.locations = item.locations;
        itemToBeAdded.reporters = item.reporters;
        itemToBeAdded.approvers = item.approvers;
        itemToBeAdded.functionheads = item.functionheads;
        itemToBeAdded.auditors = item.auditors;
        itemToBeAdded.viewers = item.viewers;
        itemToBeAdded.docs = item.docs;
        itemToBeAdded.makercheckers = item.makercheckers;
        itemToBeAdded.triggers = item.triggers;
        itemToBeAdded.tags = item.tags;
        itemToBeAdded.tagsmap = {};
        itemToBeAdded.reportersmap = {};
        itemToBeAdded.approversmap = {};
        itemToBeAdded.functionheadsmap = {};
        itemToBeAdded.auditorsmap = {};
        itemToBeAdded.viewersmap = {};
        
        for(i = 0; i < itemToBeAdded.tags.length; i++) {
            
            itemToBeAdded.tagsmap[itemToBeAdded.tags[i].split(';')[1]] = true;
            
        }
        
        
        for(i = 0; i < itemToBeAdded.reporters.length; i++) {
            
            itemToBeAdded.reportersmap[itemToBeAdded.reporters[i].split(';')[1]] = true;
            
        }
        
        
        for(i = 0; i < itemToBeAdded.approvers.length; i++) {
            
            itemToBeAdded.approversmap[itemToBeAdded.approvers[i].split(';')[1]] = true;
            
        }
    
    
        for(i = 0; i < itemToBeAdded.functionheads.length; i++) {
            
            itemToBeAdded.functionheadsmap[itemToBeAdded.functionheads[i].split(';')[1]] = true;
            
        }
        
        
        for(i = 0; i < itemToBeAdded.auditors.length; i++) {
            
            itemToBeAdded.auditorsmap[itemToBeAdded.auditors[i].split(';')[1]] = true;
            
        }
    
        for(i = 0; i < itemToBeAdded.viewers.length; i++) {
            
            itemToBeAdded.viewersmap[itemToBeAdded.viewers[i].split(';')[1]] = true;
            
        } 
        
        itemToBeAdded.countryname = item.countryname;
        itemToBeAdded.countryid = item.countryid;
        itemToBeAdded.locationname = item.locationname;
        itemToBeAdded.locationid = item.locationid;
        itemToBeAdded.entityname = item.entityname;
        itemToBeAdded.entityid = item.entityid;
        
        const arrMMDDYYYY = mmddyyyy.split('/');
        itemToBeAdded.duedate = arrMMDDYYYY[1] + "/" + arrMMDDYYYY[0] + "/" + arrMMDDYYYY[2];
        
        arrTagsEvents[tagId][mmddyyyy][item.entityid][item.locationid].push(itemToBeAdded);
        if(arrTagsEvents[tagId][mmddyyyy]['locations'] == null) {
          arrTagsEvents[tagId][mmddyyyy]['locations'] = {}; 
        }
        if(arrTagsEvents[tagId][mmddyyyy]['locations'][item.locationid] == null) {
          arrTagsEvents[tagId][mmddyyyy]['locations'][item.locationid] = item.entityid; 
        }
        if(arrTagsEvents[tagId][mmddyyyy]['countries'] == null) {
          arrTagsEvents[tagId][mmddyyyy]['countries'] = {}; 
        }
        if(arrTagsEvents[tagId][mmddyyyy]['countries'][item.countryid] == null) {
          arrTagsEvents[tagId][mmddyyyy]['countries'][item.countryid] = item.entityid; 
        }
        if(arrTagsEvents[tagId][mmddyyyy]['tags'] == null) {
          arrTagsEvents[tagId][mmddyyyy]['tags'] = {}; 
        }
        for(i = 0; i < itemToBeAdded.tags.length; i++) {
            arrTagsEvents[tagId][mmddyyyy]['tags'][itemToBeAdded.tags[i].split(';')[1]] = true;
        }
        
    }
    return (arrTagsEvents);
    
}

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

const pushUser = (usermap, userid, role, countryid, countryname, entityid, entityname, locationid, locationname, tags) => {
    
    if(usermap[userid] == null) usermap[userid] = {};
    if(usermap[userid]['roles'] == null) usermap[userid]['roles'] = {};
    if(usermap[userid]['roles'][role] == null) usermap[userid]['roles'][role] = {};
    if(usermap[userid][countryname+';'+countryid] == null) usermap[userid][countryname+';'+countryid] = {};
    if(usermap[userid][countryname+';'+countryid] == null) usermap[userid][countryname+';'+countryid] = {};
    if(usermap[userid][countryname+';'+countryid][entityname+';'+entityid] == null) usermap[userid][countryname+';'+countryid][entityname+';'+entityid] = {};
    if(usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid] == null) usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid] = {};
    if(usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid]['tags'] == null) usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid]['tags'] = [];
    
    for(var i = 0; i < tags.length; i++) {
        
        if(!usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid]['tags'].includes(tags[i])) {
            usermap[userid][countryname+';'+countryid][entityname+';'+entityid][locationname+';'+locationid]['tags'].push(tags[i]);
        }
        
    }
    
    return usermap; 
    
}

function sort(obj) {
  if (typeof obj !== "object" || Array.isArray(obj))
    return obj;
  const sortedObject = {};
  const keys = Object.keys(obj).sort();
  keys.forEach(key => sortedObject[key] = sort(obj[key]));
  return sortedObject;
}

function generateManifest(eventData) {
    
    if(eventData.mappings == null) return null;
    
    const manifest = {}
    const manifestNames = {}
    
    for(var i = 0; i < eventData.mappings.mappings.length; i++) {
        
        const countryid = eventData.mappings.mappings[i].countryid;
        const countryname = eventData.mappings.mappings[i].countryname;
        const entityid = eventData.mappings.mappings[i].entityid;
        const entityname = eventData.mappings.mappings[i].entityname;
        const locationid = eventData.mappings.mappings[i].locationid;
        const locationname = eventData.mappings.mappings[i].locationname;
        
        if(manifest[countryid] == null) {
            manifest[countryid] = {};
        }
        
        if(manifest[countryid][entityid] == null) {
            manifest[countryid][entityid] = {};
        }
        
        if(manifest[countryid][entityid][locationid] == null) {
            manifest[countryid][entityid][locationid] = {};
        }
        
        if(manifestNames[countryname] == null) {
            manifestNames[countryname] = {};
        }
        
        if(manifestNames[countryname][entityname] == null) {
            manifestNames[countryname][entityname] = {};
        }
        
        if(manifestNames[countryname][entityname][locationname] == null) {
            manifestNames[countryname][entityname][locationname] = {};
        }
        
    }
    
    return {id: manifest, name: manifestNames};
    
}

function checkActivation (item, mmddyyyy) {
    
    var pushFlag = true;
    
    if(item.activations != null && item.activations.length > 0) {
                        
        const arrActivations = item.activations.split('/');
        if(arrActivations.length === 3) {
            
            const activationsTs = new Date(arrActivations[1] + '/' + arrActivations[0] + '/' + arrActivations[2]);
            const mmddyyyyTs = new Date(mmddyyyy).getTime();
            
            if(mmddyyyyTs >= activationsTs) {
                pushFlag = true;
            } else {
                pushFlag = false;
            }
            
        }
        
    }
    
    return pushFlag;
    
    
}

function checkInvalidation (item, mmddyyyy) {
    
    var pushFlag = true;
    
    if(item.invalidations != null && item.invalidations.length > 0) {
                        
        const arrInvalidations = item.invalidations.split('/');
        if(arrInvalidations.length === 3) {
            
            const invalidationTs = new Date(arrInvalidations[1] + '/' + arrInvalidations[0] + '/' + arrInvalidations[2]);
            const mmddyyyyTs = new Date(mmddyyyy).getTime();
            
            if(mmddyyyyTs < invalidationTs) {
                pushFlag = true;
            } else {
                pushFlag = false;
            }
            
        }
        
    }
    
    return pushFlag;
    
    
}

function generateTagManifest(eventData) {
    
    if(eventData.mappings == null) return null;
    
    const manifest = {}
    const manifestNames = {}
    
    for(var i = 0; i < eventData.mappings.mappings.length; i++) {
        for(let tag of eventData.mappings.mappings[i].tags){
            // console.log('tag', tag)
            let tagArr = tag.split(";")
            let tagName = tagArr[0]
            let tagId = tagArr[1]
            let tagType = tagArr[2]
            if(manifest[tagId] == null){
                manifest[tagId] = {}
            }
            if(manifestNames[tagName] == null){
               manifestNames[tagName] = {} 
            }
        }
    }
    return {id: manifest, name: manifestNames};
}

export const processGetCalendar = async (event) => {
    
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
    var returnasis = null;
    var year = null;
    var contractstartdate = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        returnasis = JSON.parse(event.body).returnasis;
        year = JSON.parse(event.body).year;
        contractstartdate = JSON.parse(event.body).contractstartdate;
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
    
    
    if(returnasis != null) {
        if(returnasis) {
            
            var command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + year + '_calendar_job_enc.json',
            });
            
            var responseS3;
            var jsonCal = null;
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
                jsonCal = jsonContent;
                
            } catch (err) {
              flagEncryptedNotFound = true
            }
            
            if(flagEncryptedNotFound){
                command = new GetObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: projectid + '_' + year + '_calendar_job.json',
                });
                
                responseS3;
                jsonCal = null;
                try {
                    responseS3 = await s3Client.send(command);
                    const s3ResponseStream = responseS3.Body; 
                    const chunks = []
                    for await (const chunk of s3ResponseStream) {
                        chunks.push(chunk)
                    }
                    const responseBuffer = Buffer.concat(chunks)
                    const jsonContent = JSON.parse(responseBuffer.toString());
                    jsonCal = jsonContent;
                    
                } catch (err) {
                    
                }
            }
            const response = {statusCode: 200, body: {result: true, data: jsonCal}};
            return response;
            
        }
    }
    
    const jsonFunctionsData = await getObjectData(projectid, 'functions');
    
    const manifest = generateManifest(jsonFunctionsData);
    
    if(manifest == null) {
        const response =  {statusCode: 404, body: { result: false, error: "Not Found!"}};
        return response;
    }
    let encryptedData = await processEncryptData(projectid, JSON.stringify(manifest.id))
    var command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_manifest_id_calendar_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    var responseS3;
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
    }
    encryptedData = await processEncryptData(projectid, JSON.stringify(manifest.name))
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_manifest_name_calendar_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
    }
    
    
    const uniqueLocations = [];
    
    
    const jsonTagsData = await getObjectData(projectid, 'tags');
    
    const manifestTags = generateTagManifest(jsonTagsData);
    
    if(manifestTags == null) {
        const response =  {statusCode: 404, body: { result: false, error: "Tags Manifest Not Found!"}};
        return response;
    }
    encryptedData = await processEncryptData(projectid, JSON.stringify(manifestTags.id))
    var command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_tags_manifest_id_calendar_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    var responseS3;
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
    
    }
    encryptedData = await processEncryptData(projectid, JSON.stringify(manifestTags.name))
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_tags_manifest_name_calendar_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
    }
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
    
    var arrEvents = {};
    var arrDB = {};
    var arrTagsEvents = {};
    
    let countprint = 0;
    
    const uniqueReporters = [];
    
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
        
        const indexDuedate = JSON.parse(item.cols).indexOf('duedate');
        const arrDuedates = JSON.parse(item.data)[indexDuedate].split(',')
        
        for(let tag of item.tagsonly) {
                    
            const tagId = tag.split(';')[1];
            if(tagId.indexOf('26a9cefe') >= 0 && countprint < 20) {
                if(!uniqueReporters.includes(JSON.stringify(item.reporters))) {
                    // if(JSON.stringify(item.reporters).indexOf('Mano') < 0) {
                        // console.log('checking reporters', item.reporters, i, countprint);
                        countprint++; 
                    // }
                    uniqueReporters.push(JSON.stringify(item.reporters));
                }
            }
            
        }
        
        for(var j = 0; j < arrDuedates.length; j++) {
            
            if(arrDuedates[j].trim() == "0/0/*") {
                
                var mmddyyyy = "00/00";
                arrEvents = pushEvent(arrEvents, mmddyyyy, item, contractstartdate);
                arrTagsEvents = (pushEventTag(arrTagsEvents, mmddyyyy, item, contractstartdate));
                
                
                
            } else if(arrDuedates[j].trim() == "31/*/*") {
                
                var arrDueDate = arrDuedates[j].split('/');
                
                var l = 4;
                
                while(true) {
                    
                    if(!isNumeric(arrDueDate[0])) {
                        continue;
                    }
                    
                    var mm = ("0" + l).slice(-2);
                    var yyyy = getFincalFromMonth(mm, (new Date()).getFullYear())
                    var dd = ("0" + lastDayOfMonth(yyyy, mm)).slice(-2);
                    
                    mmddyyyy = mm + '/' + dd + '/' + yyyy;
                    
                    var pushFlag = true;
                    
                    pushFlag = checkActivation(item);
                    pushFlag = checkInvalidation(item);
                    
                    if(pushFlag) {
                        
                        arrEvents = pushEvent(arrEvents, mmddyyyy, item, contractstartdate);
                        arrTagsEvents = (pushEventTag(arrTagsEvents, mmddyyyy, item, contractstartdate));
                        
                    }
                    
                    if(l === 3) {
                        break;
                    }
                    
                    if(l === 12) {
                        l = 1;
                    } else {
                        l++;
                    }
                    
                }
                
            } else {
                
                var arrDueDate = arrDuedates[j].split('/');
            
                
                if(arrDueDate.length != 3) {
                    continue;
                }
                
                if(arrDueDate[2].trim() == "*") {
                    
                    if(arrDueDate[1].trim() == "*") {
                        
                        l = 4;
                
                        while(true) {
                            
                            if(!isNumeric(arrDueDate[0].trim())) {
                                continue;
                            }
                            
                            mm = ("0" + l).slice(-2);
                            yyyy = getFincalFromMonth(mm, (new Date()).getFullYear())
                            dd = ("0" + lastDayOfMonth(yyyy, mm)).slice(-2);
                            
                            mmddyyyy = mm + '/' + dd + '/' + yyyy;
                            
                            pushFlag = true;
                    
                            pushFlag = checkActivation(item);
                            pushFlag = checkInvalidation(item);
                            
                            
                            
                            if(pushFlag) {
                                
                                arrEvents = pushEvent(arrEvents, mmddyyyy, item, contractstartdate);
                                arrTagsEvents = (pushEventTag(arrTagsEvents, mmddyyyy, item, contractstartdate));
                                
                            }
                            
                            if(l === 3) {
                                break;
                            }
                            
                            if(l === 12) {
                                l = 1;
                            } else {
                                l++;
                            }
                            
                        }
                        
                        
                    } else {
                        
                        if(!isNumeric(arrDueDate[0].trim()) || !isNumeric(arrDueDate[1].trim())) {
                            console.log('continuing');
                            continue;
                        }
                        
                        mm = ("0" + arrDueDate[1].trim()).slice(-2); 
                        dd = ("0" + arrDueDate[0].trim()).slice(-2);
                        yyyy = getFincalFromMonth(mm, (new Date()).getFullYear())
                        
                        mmddyyyy = mm + '/' + dd + '/' + yyyy;
                        
                        pushFlag = true;
                    
                        pushFlag = checkActivation(item);
                        pushFlag = checkInvalidation(item);
                        
                        if(pushFlag) {
                            
                            arrEvents = pushEvent(arrEvents, mmddyyyy, item, contractstartdate);
                            arrTagsEvents = (pushEventTag(arrTagsEvents, mmddyyyy, item, contractstartdate));
                            
                        }
                        
                    }
                    
                } else {
                    
                    if(!isNumeric(arrDueDate[0].trim()) || !isNumeric(arrDueDate[1].trim()) || !isNumeric(arrDueDate[2].trim())) {
                        continue;
                    }
                    
                    mm = ("0" + arrDueDate[1].trim()).slice(-2);
                    dd = ("0" + arrDueDate[0].trim()).slice(-2);
                    yyyy = getFincalFromMonth(mm, (new Date()).getFullYear());
                    
                    mmddyyyy = mm + '/' + dd + '/' + yyyy;
                    
                    // console.log('mmddyyyy', mmddyyyy);
                    
                    pushFlag = true;
                    
                    pushFlag = checkActivation(item);
                    pushFlag = checkInvalidation(item);
                    
                    if(pushFlag) {
                          
                        arrEvents = pushEvent(arrEvents, mmddyyyy, item, contractstartdate);    
                        arrTagsEvents = (pushEventTag(arrTagsEvents, mmddyyyy, item, contractstartdate));    
                        
                        
                    }
                    
                    
                }
                
            }
            
        }
        
        
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
    
    
    for(i = 0; i < Object.keys(arrEvents).length; i++) {
        
        const key = Object.keys(arrEvents)[i];
        encryptedData = await processEncryptData(projectid, JSON.stringify(arrEvents[key]))
        var command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_' + key + '_' + year + '_calendar_job_enc.json',
          Body: encryptedData,
          ContentType: 'application/json'
        });
        
        try {
          responseS3 = await s3Client.send(command);
        } catch (err) {
          responseS3 = err;
        }
        
    }
    
    for(i = 0; i < Object.keys(arrTagsEvents).length; i++) {
        
        const key = Object.keys(arrTagsEvents)[i];
        let jsonStr = JSON.stringify(arrTagsEvents[key])
        encryptedData = await processEncryptData(projectid, jsonStr)
        command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: projectid + '_' + key + '_' + year + '_calendar_job_enc.json',
          Body: encryptedData,
          ContentType: 'application/json'
        });
        
        try {
          responseS3 = await s3Client.send(command);
        } catch (err) {
          responseS3 = err;
        }
        
    }
    encryptedData = await processEncryptData(projectid, JSON.stringify(arrEvents))
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_'+ year +'_calendar_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
    }
    
    const ordered = sort(arrDB);
    
    for(var k = 0; k < Object.keys(ordered).length; k++) {
        
        const country = Object.keys(ordered)[k];
        ordered[country] = sort(ordered[country]);
        
    }
    encryptedData = await processEncryptData(projectid, JSON.stringify(ordered))
    command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_calendar_db_job_enc.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    responseS3;
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
    }
    
    var usermap = {};
    
    for(i = 0; i < Object.keys(arrEvents).length; i++) {
        
        const location = Object.keys(arrEvents)[i];
        for(var n = 0; n < Object.keys(arrEvents[location]).length; n++) {
            
            const mmddyyyy = Object.keys(arrEvents[location])[n];
        
            for(var j = 0; j < Object.keys(arrEvents[location][mmddyyyy]).length; j++) {
                
                const entityid = Object.keys(arrEvents[location][mmddyyyy])[j];
                
                if(entityid.length != 36) continue;
                
                console.log('entityid', entityid, 'length',Object.keys(arrEvents[location][mmddyyyy][entityid]).length)
                for(var k = 0; k < Object.keys(arrEvents[location][mmddyyyy][entityid]).length; k++) {
                    
                    const locationid = Object.keys(arrEvents[location][mmddyyyy][entityid])[k];
                    
                    if(locationid.length != 36) continue; 
                    for(var l = 0; l < arrEvents[location][mmddyyyy][entityid][locationid].length; l++) {
                        
                        const ev = arrEvents[location][mmddyyyy][entityid][locationid][l];
                        const countryid = ev.countryid;
                        const countryname = ev.countryname;
                        const entityname = ev.entityname;
                        const locationname = ev.locationname;
                        const tags = ev.tags;
                        
                        for(var m = 0; m < ev.reporters.length; m++) {
                            
                            const reporterid = ev.reporters[m].split(';')[1];
                            usermap = pushUser(usermap, reporterid, 'reporter', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                            
                        }
                        
                        for(var m = 0; m < ev.approvers.length; m++) {
                            
                            const approverid = ev.approvers[m].split(';')[1];
                            usermap = pushUser(usermap, approverid, 'approver', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                            
                        }
                        
                        for(var m = 0; m < ev.functionheads.length; m++) {
                            
                            const functionheadid = ev.functionheads[m].split(';')[1];
                            usermap = pushUser(usermap, functionheadid, 'functionhead', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                            
                        }
                        
                        for(var m = 0; m < ev.auditors.length; m++) {
                            
                            // console.log('auditors', ev.auditors, projectid);
                            const auditorid = ev.auditors[m].split(';')[1];
                            usermap = pushUser(usermap, auditorid, 'auditor', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                            
                        }
                        
                        for(var m = 0; m < ev.viewers.length; m++) {
                            
                            const viewersid = ev.viewers[m].split(';')[1];
                            usermap = pushUser(usermap, viewersid, 'viewers', countryid, countryname, entityid, entityname, locationid, locationname, tags);
                            
                        }
                           
                    }
    
                }
    
            }
            
        }
        
    }
    encryptedData = await processEncryptData(projectid, JSON.stringify(usermap))
    var command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: projectid + '_usermap_job.json',
      Body: encryptedData,
      ContentType: 'application/json'
    });
    
    var responseS3;
    
    try {
      responseS3 = await s3Client.send(command);
    } catch (err) {
      responseS3 = err;
    }
    
    const response = {statusCode: 200, body: {result: true, usermap: usermap}};
    return response;
    

}