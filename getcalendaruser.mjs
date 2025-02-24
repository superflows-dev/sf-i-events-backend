// getcalendar (projectid)


import { REGION, TABLE, AUTH_ENABLE, AUTH_REGION, AUTH_API, AUTH_STAGE, ROLES_ORDER, ddbClient, GetItemCommand, ScanCommand, PutItemCommand, ADMIN_METHODS, PutObjectCommand, BUCKET_NAME, s3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, NUM_ONBOARDING_BACKUPS, CALENDAR_PROCESS_BLOCK_SIZE, schedulerClient, CreateScheduleCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { newUuidV4 } from './newuuid.mjs';
import { processAddLog } from './addlog.mjs';
import { processDecryptData } from './decryptdata.mjs'
import { processEncryptData } from './encryptdata.mjs'
import { processUpdateUserMap } from './updateusermap.mjs'
import { processGetProjectDetails } from './getprojectdetails.mjs';
import { processSendEmail } from './sendemail.mjs'
import { processGenerateUserMap } from './generateusermap.mjs'
import { processCheckRequestid } from './checkrequestid.mjs'
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

const getCurrentFiscal = () => {
    let date = new Date()
    if(date.getMonth() < 4){
        return (date.getFullYear() - 1)
    }
    return date.getFullYear();
}

const pushEventUser = (arrUsersEvents, mmddyyyy, item, contractStartDate, role) => {
    
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
            
            // console.log('arrUsersEvents', arrUsersEvents);
            
            return arrUsersEvents;
        }
    
    }
    
    for(var k = 0 ; k < item[role].length; k++){
        const userArr = item[role][k].split(";")
        const userName = userArr[0]
        const userId = userArr[1]
        
        if(arrUsersEvents[userId] == null) {
            arrUsersEvents[userId] = {}    
        }
        if(arrUsersEvents[userId][mmddyyyy] == null) {
            arrUsersEvents[userId][mmddyyyy] = {}    
        }
        
        if(arrUsersEvents[userId][mmddyyyy][item.entityid] == null) {
            arrUsersEvents[userId][mmddyyyy][item.entityid] = {}    
        }
        
        if(arrUsersEvents[userId][mmddyyyy][item.entityid][item.locationid] == null) {
            arrUsersEvents[userId][mmddyyyy][item.entityid][item.locationid] = []    
        }
        if(item.extensions != null && item.extensions.trim().length > 0) {
        
            const extensions = JSON.parse(item.extensions);
            for(var i = 0; i < extensions.length; i++) {
                
                const mmddyyyyStart = extensions[i].split('-')[0].trim();
                const mmddyyyyEnd = extensions[i].split('-')[1].trim();
                
                if(mmddyyyyStart == mmddyyyy) {
                    
                    return pushEventUser(arrUsersEvents, mmddyyyyEnd, item, contractStartDate);
                    
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
        itemToBeAdded.functions = item.functions;
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
        
        arrUsersEvents[userId][mmddyyyy][item.entityid][item.locationid].push(itemToBeAdded);
        
        if(arrUsersEvents[userId][mmddyyyy]['locations'] == null) {
          arrUsersEvents[userId][mmddyyyy]['locations'] = {}; 
        }
        if(arrUsersEvents[userId][mmddyyyy]['locations'][item.locationid] == null) {
          arrUsersEvents[userId][mmddyyyy]['locations'][item.locationid] = item.entityid; 
        }
        if(arrUsersEvents[userId][mmddyyyy]['countries'] == null) {
          arrUsersEvents[userId][mmddyyyy]['countries'] = {}; 
        }
        if(arrUsersEvents[userId][mmddyyyy]['countries'][item.countryid] == null) {
          arrUsersEvents[userId][mmddyyyy]['countries'][item.countryid] = []; 
        }
        if(arrUsersEvents[userId][mmddyyyy]['countries'][item.countryid].indexOf(item.entityid) < 0){
            arrUsersEvents[userId][mmddyyyy]['countries'][item.countryid].push(item.entityid)
        }
        if(arrUsersEvents[userId][mmddyyyy]['tags'] == null) {
          arrUsersEvents[userId][mmddyyyy]['tags'] = {}; 
        }
        for(i = 0; i < itemToBeAdded.tags.length; i++) {
            arrUsersEvents[userId][mmddyyyy]['tags'][itemToBeAdded.tags[i].split(';')[1]] = true;
        }
        
    }
    return (arrUsersEvents);
    
}

const combineCalendarArray = (arrUsersEvents, tempArrUserArray, userId) => {
    if(tempArrUserArray == {}){
        return {}
    }
    if(arrUsersEvents[userId] == null) {
        arrUsersEvents[userId] = {}    
    }
    
    for(let mmddyyyy of Object.keys(tempArrUserArray)){
        if(arrUsersEvents[userId][mmddyyyy] == null) {
            arrUsersEvents[userId][mmddyyyy] = {}    
        }
        
        
        for (let entityid of (Object.keys(tempArrUserArray[mmddyyyy]))){
            if(arrUsersEvents[userId][mmddyyyy][entityid] == null) {
                arrUsersEvents[userId][mmddyyyy][entityid] = {}    
            }
            if(entityid != "locations" && entityid != "countries" && entityid != "tags"){
                for(let locationid of(Object.keys(tempArrUserArray[mmddyyyy][entityid]))){
                    if(arrUsersEvents[userId][mmddyyyy][entityid][locationid] == null) {
                        arrUsersEvents[userId][mmddyyyy][entityid][locationid] = []    
                    }
                    for(let item of tempArrUserArray[mmddyyyy][entityid][locationid]){
                        arrUsersEvents[userId][mmddyyyy][item.entityid][item.locationid].push(item);
        
                        if(arrUsersEvents[userId][mmddyyyy]['locations'] == null) {
                          arrUsersEvents[userId][mmddyyyy]['locations'] = {}; 
                        }
                        if(arrUsersEvents[userId][mmddyyyy]['locations'][item.locationid] == null) {
                          arrUsersEvents[userId][mmddyyyy]['locations'][item.locationid] = item.entityid; 
                        }
                        if(arrUsersEvents[userId][mmddyyyy]['countries'] == null) {
                          arrUsersEvents[userId][mmddyyyy]['countries'] = {}; 
                        }
                        if(arrUsersEvents[userId][mmddyyyy]['countries'][item.countryid] == null) {
                          arrUsersEvents[userId][mmddyyyy]['countries'][item.countryid] = []; 
                        }
                        if(arrUsersEvents[userId][mmddyyyy]['countries'][item.countryid].indexOf(item.entityid) < 0){
                            arrUsersEvents[userId][mmddyyyy]['countries'][item.countryid].push(item.entityid)
                        }
                        if(arrUsersEvents[userId][mmddyyyy]['tags'] == null) {
                          arrUsersEvents[userId][mmddyyyy]['tags'] = {}; 
                        }
                        for(let i = 0; i < item.tags.length; i++) {
                            arrUsersEvents[userId][mmddyyyy]['tags'][item.tags[i].split(';')[1]] = true;
                        }
                    }
                }   
            }
        }
    }
    
    return (arrUsersEvents);
    
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

const sendSyncError = async (projectid, onboardingstep, authorization) => {
    var command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key:'erroremaillist.json'
    })
    var jsonData = {};
  
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let responsedata = responseBuffer.toString()
        jsonData = JSON.parse(responsedata)    
    } catch (err) {
        console.log("list read error",err); 
    }
    
    let flagSend = true;
    if(jsonData[projectid] != null){
        flagSend = false;
    }
    
    if(flagSend){
        //SendEmail
        let responseProject = await processGetProjectDetails(authorization, {id: projectid})
        console.log('project', responseProject);
        let project = responseProject.data.value
        let projectname = project.name.replace(/"/g,"")
        let subject = `[FlaggGRC-Error] Onboarding out of sync [${projectname}] - ${new Date().toLocaleDateString('en-IN')} - ${new Date().toLocaleTimeString('en-IN')}`
        let bodyHtml = `<p>The <strong>${onboardingstep}</strong> step in onboarding of the project <strong>${projectname}</strong> is out of sync. Please check and then try to generate the calendar again.</p>`
        let to = "shruti.d@flagggrc.com, madhura.z@flagggrc.com, kshitij.g@flagggrc.com, unnati.j@flagggrc.com, hrushi@flagggrc.tech, jomon.j@flagggrc.tech, ninad.t@flagggrc.tech"
        await processSendEmail(to, subject, '', bodyHtml);
        
        if(jsonData[projectid] == null){
            jsonData[projectid] = []
        }
        jsonData[projectid].push(onboardingstep)
        command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: 'erroremaillist.json',
            Body: JSON.stringify(jsonData),
            ContentType: 'application/json'
        });
          
        try {
            await s3Client.send(command);
        } catch (err) {
            console.log("list save error",err);
        }
    }
}


export const processGetCalendarUser = async (event) => {
    let flagRequest = await processCheckRequestid(JSON.parse(event.body).requestid)
    if(!flagRequest){
        console.log('returning calendar');
        return;
    }
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
    var userid = null;
    var contractstartdate = null;
    var startIndex = "0";
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        year = JSON.parse(event.body).year;
        userid = JSON.parse(event.body).userid;
        contractstartdate = JSON.parse(event.body).contractstartdate;
        startIndex = JSON.parse(event.body).startindex ?? "0";
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
    
    
    const jsonFunctionsData = await getObjectData(projectid, 'functions');
    const uniqueLocations = [];
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
    
    var arrReportersEvents = {};
    var arrApproversEvents = {};
    var arrFunctionHeadsEvents = {};
    var arrAuditorsEvents = {};
    var arrViewersEvents = {};
    
    let countprint = 0;
    
    const uniqueReporters = [];
    for(var i = (parseInt(startIndex) * CALENDAR_PROCESS_BLOCK_SIZE); i < jsonFunctionsData.mappings.mappings.length && i < ((parseInt(startIndex) + 1) * CALENDAR_PROCESS_BLOCK_SIZE); i++) {
        
        var item = jsonFunctionsData.mappings.mappings[i];
        if(item.id == "a572a8ee-2e28-4283-a824-3b3a915f2489"){
            console.log('processing', i, item.id);
        }
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
            await sendSyncError(projectid, 'tags', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Tags not In Sync!"}};
            return response;
        }
        if(itemReporters != null && itemReporters.reporters != null) {
            item.reporters = itemReporters.reporters;
        } else {
            await sendSyncError(projectid, 'reporters', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Reporters not In Sync!"}};
            return response;
        }
        if(itemApprovers != null && itemApprovers.approvers != null) {
            item.approvers = itemApprovers.approvers;    
        } else {
            await sendSyncError(projectid, 'approvers', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Approvers not In Sync!"}};
            return response;
        }
        if(itemFunctionheads != null && itemFunctionheads.functionheads != null) {
            item.functionheads = itemFunctionheads.functionheads;    
        } else {
            await sendSyncError(projectid, 'functionheads', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Functionheads not In Sync!"}};
            return response;
        }
        if(itemAuditors != null && itemAuditors.auditors != null) {
            item.auditors = itemAuditors.auditors;
        } else {
            await sendSyncError(projectid, 'auditors', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Auditors not In Sync!"}};
            return response;
        }
        if(itemViewers != null && itemViewers.viewers != null) {
            item.viewers = itemViewers.viewers;    
        } else {
            await sendSyncError(projectid, 'viewers', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Viewers not In Sync!"}};
            return response;
        }
        if(itemDocs != null && itemDocs.docs != null) {
            item.docs = itemDocs.docs;    
        } else {
            await sendSyncError(projectid, 'docs', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Docs not In Sync!"}};
            return response;
        }
        if(itemMakercheckers != null && itemMakercheckers.makercheckers != null) {
            item.makercheckers = itemMakercheckers.makercheckers;    
        } else {
            await sendSyncError(projectid, 'makercheckers', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Makercheckers not In Sync!"}};
            return response;
        }
        if(itemDuedates != null && itemDuedates.duedates != null) {
            item.duedates = itemDuedates.duedates;    
        } else {
            await sendSyncError(projectid, 'duedates', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Duedates not In Sync!"}};
            return response;
        }
        if(itemExtensions != null && itemExtensions.extensions != null) {
            item.extensions = itemExtensions.extensions;    
        } else {
            await sendSyncError(projectid, 'extensions', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Extensions not In Sync!"}};
            return response;
        }
        if(itemAlertschedules != null && itemAlertschedules.alertschedules != null) {
            item.alertschedules = itemAlertschedules.alertschedules;    
        } else {
            await sendSyncError(projectid, 'alertschedules', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Alertschedules not In Sync!"}};
            return response;
        }
        if(itemTriggers != null && itemTriggers.triggers != null) {
            item.triggers = itemTriggers.triggers;    
        } else {
            await sendSyncError(projectid, 'triggers', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Triggers not In Sync!"}};
            return response;
        }
        if(itemActivations != null && itemActivations.activations != null) {
            item.activations = itemActivations.activations;    
        } else {
            await sendSyncError(projectid, 'activations', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Activations not In Sync!"}};
            return response;
        }
        if(itemInvalidations != null && itemInvalidations.invalidations != null) {
            item.invalidations = itemInvalidations.invalidations;    
        } else {
            await sendSyncError(projectid, 'invalidations', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Invalidations not In Sync!"}};
            return response;
        }
        if(itemInternalControls != null && itemInternalControls.internalcontrols != null) {
            item.internalcontrols = itemInternalControls.internalcontrols;    
        } else {
            await sendSyncError(projectid, 'internalcontrols', event["headers"]["Authorization"])
            const response = {statusCode: 400, body: { result: false, error: "Internalcontrols not In Sync!"}};
            return response;
        }
        
        item.tagsonly = JSON.parse(JSON.stringify(item.tags));
        
        const tags = [];
        // console.log('functions', item.functions);
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
        
        if(item.triggers.length > 0) {
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
        if(item.id == "bdf7fbe0-fb80-4305-92c7-bb728833e5b4"){
            console.log('arrDuedates',arrDuedates)
        }
        if(item.id == "a572a8ee-2e28-4283-a824-3b3a915f2489"){
            console.log('here 1', item.id)
        }
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
        if(item.id == "a572a8ee-2e28-4283-a824-3b3a915f2489"){
            console.log('here 2', arrDuedates, item.id)
        }
        for(var j = 0; j < arrDuedates.length; j++) {
            
            if(arrDuedates[j].trim() == "0/0/*") {
                
                var mmddyyyy = "00/00";
                if(JSON.stringify(item.reporters).indexOf(userid) >= 0){
                    arrReportersEvents = (pushEventUser(arrReportersEvents, mmddyyyy, item, contractstartdate,'reporters'));
                }
                if(JSON.stringify(item.approvers).indexOf(userid) >= 0){
                    arrApproversEvents = (pushEventUser(arrApproversEvents, mmddyyyy, item, contractstartdate,'approvers'));
                }
                if(JSON.stringify(item.functionheads).indexOf(userid) >= 0){
                    arrFunctionHeadsEvents = (pushEventUser(arrFunctionHeadsEvents, mmddyyyy, item, contractstartdate,'functionheads'));
                }
                if(JSON.stringify(item.auditors).indexOf(userid) >= 0){
                    arrAuditorsEvents = (pushEventUser(arrAuditorsEvents, mmddyyyy, item, contractstartdate,'auditors'));
                }
                if(JSON.stringify(item.viewers).indexOf(userid) >= 0){
                    arrViewersEvents = (pushEventUser(arrViewersEvents, mmddyyyy, item, contractstartdate,'viewers'));
                }
                
            } else if(arrDuedates[j].trim() == "31/*/*") {
                
                var arrDueDate = arrDuedates[j].split('/');
                
                var l = 4;
                
                while(true) {
                    
                    if(!isNumeric(arrDueDate[0])) {
                        continue;
                    }
                    
                    var mm = ("0" + l).slice(-2);
                    var yyyy = getFincalFromMonth(mm, new Date().getFullYear())
                    var dd = ("0" + lastDayOfMonth(yyyy, mm)).slice(-2);
                    
                    mmddyyyy = mm + '/' + dd + '/' + yyyy;
                    
                    var pushFlag = true;
                    
                    pushFlag = checkActivation(item);
                    pushFlag = checkInvalidation(item);
                    
                    if(pushFlag) {
                        
                        if(JSON.stringify(item.reporters).indexOf(userid) >= 0){
                            arrReportersEvents = (pushEventUser(arrReportersEvents, mmddyyyy, item, contractstartdate,'reporters'));
                        }
                        if(JSON.stringify(item.approvers).indexOf(userid) >= 0){
                            arrApproversEvents = (pushEventUser(arrApproversEvents, mmddyyyy, item, contractstartdate,'approvers'));
                        }
                        if(JSON.stringify(item.functionheads).indexOf(userid) >= 0){
                            arrFunctionHeadsEvents = (pushEventUser(arrFunctionHeadsEvents, mmddyyyy, item, contractstartdate,'functionheads'));
                        }
                        if(JSON.stringify(item.auditors).indexOf(userid) >= 0){
                            arrAuditorsEvents = (pushEventUser(arrAuditorsEvents, mmddyyyy, item, contractstartdate,'auditors'));
                        }
                        if(JSON.stringify(item.viewers).indexOf(userid) >= 0){
                            arrViewersEvents = (pushEventUser(arrViewersEvents, mmddyyyy, item, contractstartdate,'viewers'));
                        }
                        
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
                        if(arrDueDate[0].trim() == "*"){
                            let d = 1;
                            while(true){
                                
                                mm = ("0" + l).slice(-2);
                                yyyy = getFincalFromMonth(mm, new Date().getFullYear())
                                dd = ("0" + d).slice(-2);
                                
                                mmddyyyy = mm + '/' + dd + '/' + yyyy;
                                console.log('date', mmddyyyy);
                                pushFlag = true;
                        
                                pushFlag = checkActivation(item);
                                pushFlag = checkInvalidation(item);
                                
                                
                                
                                if(pushFlag) {
                                    
                                    if(JSON.stringify(item.reporters).indexOf(userid) >= 0){
                                        arrReportersEvents = (pushEventUser(arrReportersEvents, mmddyyyy, item, contractstartdate,'reporters'));
                                    }
                                    if(JSON.stringify(item.approvers).indexOf(userid) >= 0){
                                        arrApproversEvents = (pushEventUser(arrApproversEvents, mmddyyyy, item, contractstartdate,'approvers'));
                                    }
                                    if(JSON.stringify(item.functionheads).indexOf(userid) >= 0){
                                        arrFunctionHeadsEvents = (pushEventUser(arrFunctionHeadsEvents, mmddyyyy, item, contractstartdate,'functionheads'));
                                    }
                                    if(JSON.stringify(item.auditors).indexOf(userid) >= 0){
                                        arrAuditorsEvents = (pushEventUser(arrAuditorsEvents, mmddyyyy, item, contractstartdate,'auditors'));
                                    }
                                    if(JSON.stringify(item.viewers).indexOf(userid) >= 0){
                                        arrViewersEvents = (pushEventUser(arrViewersEvents, mmddyyyy, item, contractstartdate,'viewers'));
                                    }
                                    
                                }
                                
                                if(l === 3 && d === 31) {
                                    break;
                                }
                                if(d == lastDayOfMonth(yyyy, l)){
                                    d = 1;
                                    if(l === 12) {
                                        l = 1;
                                    } else {
                                        l++;
                                    }
                                }else{
                                    d ++;
                                }
                                
                            }
                        }else{
                            while(true) {
                                
                                if(!isNumeric(arrDueDate[0].trim())) {
                                    continue;
                                }
                                
                                mm = ("0" + l).slice(-2);
                                yyyy = getFincalFromMonth(mm, new Date().getFullYear())
                                dd = ("0" + arrDueDate[0].trim()).slice(-2);
                                
                                mmddyyyy = mm + '/' + dd + '/' + yyyy;
                                
                                pushFlag = true;
                        
                                pushFlag = checkActivation(item);
                                pushFlag = checkInvalidation(item);
                                
                                
                                
                                if(pushFlag) {
                                    
                                    if(JSON.stringify(item.reporters).indexOf(userid) >= 0){
                                        arrReportersEvents = (pushEventUser(arrReportersEvents, mmddyyyy, item, contractstartdate,'reporters'));
                                    }
                                    if(JSON.stringify(item.approvers).indexOf(userid) >= 0){
                                        arrApproversEvents = (pushEventUser(arrApproversEvents, mmddyyyy, item, contractstartdate,'approvers'));
                                    }
                                    if(JSON.stringify(item.functionheads).indexOf(userid) >= 0){
                                        arrFunctionHeadsEvents = (pushEventUser(arrFunctionHeadsEvents, mmddyyyy, item, contractstartdate,'functionheads'));
                                    }
                                    if(JSON.stringify(item.auditors).indexOf(userid) >= 0){
                                        arrAuditorsEvents = (pushEventUser(arrAuditorsEvents, mmddyyyy, item, contractstartdate,'auditors'));
                                    }
                                    if(JSON.stringify(item.viewers).indexOf(userid) >= 0){
                                        arrViewersEvents = (pushEventUser(arrViewersEvents, mmddyyyy, item, contractstartdate,'viewers'));
                                    }
                                    
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
                        }

                        
                    } else {
                        
                        if(!isNumeric(arrDueDate[0].trim()) || !isNumeric(arrDueDate[1].trim())) {
                            // console.log('continuing');
                            continue;
                        }
                        
                        mm = ("0" + arrDueDate[1].trim()).slice(-2); 
                        dd = ("0" + arrDueDate[0].trim()).slice(-2);
                        yyyy = getFincalFromMonth(mm, new Date().getFullYear())
                        
                        mmddyyyy = mm + '/' + dd + '/' + yyyy;
                        
                        pushFlag = true;
                    
                        pushFlag = checkActivation(item);
                        pushFlag = checkInvalidation(item);
                        
                        if(pushFlag) {
                            
                            if(JSON.stringify(item.reporters).indexOf(userid) >= 0){
                                arrReportersEvents = (pushEventUser(arrReportersEvents, mmddyyyy, item, contractstartdate,'reporters'));
                            }
                            if(JSON.stringify(item.approvers).indexOf(userid) >= 0){
                                arrApproversEvents = (pushEventUser(arrApproversEvents, mmddyyyy, item, contractstartdate,'approvers'));
                            }
                            if(JSON.stringify(item.functionheads).indexOf(userid) >= 0){
                                arrFunctionHeadsEvents = (pushEventUser(arrFunctionHeadsEvents, mmddyyyy, item, contractstartdate,'functionheads'));
                            }
                            if(JSON.stringify(item.auditors).indexOf(userid) >= 0){
                                arrAuditorsEvents = (pushEventUser(arrAuditorsEvents, mmddyyyy, item, contractstartdate,'auditors'));
                            }
                            if(JSON.stringify(item.viewers).indexOf(userid) >= 0){
                                arrViewersEvents = (pushEventUser(arrViewersEvents, mmddyyyy, item, contractstartdate,'viewers'));
                            }
                            
                        }
                        
                    }
                    
                } else {
                    
                    if(!isNumeric(arrDueDate[0].trim()) || !isNumeric(arrDueDate[1].trim()) || !isNumeric(arrDueDate[2].trim())) {
                        continue;
                    }
                    
                    mm = ("0" + arrDueDate[1].trim()).slice(-2);
                    dd = ("0" + arrDueDate[0].trim()).slice(-2);
                    yyyy = getFincalFromMonth(mm, new Date().getFullYear());
                    
                    mmddyyyy = mm + '/' + dd + '/' + yyyy;
                    
                    // console.log('mmddyyyy', mmddyyyy);
                    
                    pushFlag = true;
                    
                    pushFlag = checkActivation(item);
                    pushFlag = checkInvalidation(item);
                    
                    if(pushFlag) {
                          
                        if(JSON.stringify(item.reporters).indexOf(userid) >= 0){
                            arrReportersEvents = (pushEventUser(arrReportersEvents, mmddyyyy, item, contractstartdate,'reporters'));
                        }
                        if(JSON.stringify(item.approvers).indexOf(userid) >= 0){
                            arrApproversEvents = (pushEventUser(arrApproversEvents, mmddyyyy, item, contractstartdate,'approvers'));
                        }
                        if(JSON.stringify(item.functionheads).indexOf(userid) >= 0){
                            arrFunctionHeadsEvents = (pushEventUser(arrFunctionHeadsEvents, mmddyyyy, item, contractstartdate,'functionheads'));
                        }
                        if(JSON.stringify(item.auditors).indexOf(userid) >= 0){
                            arrAuditorsEvents = (pushEventUser(arrAuditorsEvents, mmddyyyy, item, contractstartdate,'auditors'));
                        }
                        if(JSON.stringify(item.viewers).indexOf(userid) >= 0){
                            arrViewersEvents = (pushEventUser(arrViewersEvents, mmddyyyy, item, contractstartdate,'viewers'));
                        }
                        
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
        
    }
    
    console.log('generating calendar', jsonFunctionheadsData.mappings.mappings.length, ((parseInt(startIndex) + 1) * CALENDAR_PROCESS_BLOCK_SIZE), Object.keys(arrReportersEvents).length)

    
    var command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'calendars_log_' + projectid + '.json',
    });
    var flagError = false
    var statsObj = {};
    try {
        const response = await s3Client.send(command);
        const s3ResponseStream = response.Body; 
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        const jsonContent = JSON.parse(responseBuffer.toString());
        statsObj = jsonContent;
        
    } catch (err) {
        console.log('calendar log read error', err)
    }
    if(statsObj[userid] == null || startIndex == "0"){
        statsObj[userid] = []
    }
    let compliancesCount = 0
    if(arrReportersEvents[userid] != null){
        for(let tempdate of Object.keys(arrReportersEvents[userid])){
            compliancesCount += arrReportersEvents[userid][tempdate].length
        }
    }
    if(arrApproversEvents[userid] != null){
        for(let tempdate of Object.keys(arrApproversEvents[userid])){
            compliancesCount += arrApproversEvents[userid][tempdate].length
        }
    }
    if(arrFunctionHeadsEvents[userid] != null){
        for(let tempdate of Object.keys(arrFunctionHeadsEvents[userid])){
            compliancesCount += arrFunctionHeadsEvents[userid][tempdate].length
        }
    }
    if(arrAuditorsEvents[userid] != null){
        for(let tempdate of Object.keys(arrAuditorsEvents[userid])){
            compliancesCount += arrAuditorsEvents[userid][tempdate].length
        }
    }
    if(arrViewersEvents[userid] != null){
        for(let tempdate of Object.keys(arrViewersEvents[userid])){
            compliancesCount += arrViewersEvents[userid][tempdate].length
        }
    }
    statsObj[userid].push({"startIndex":startIndex,"Executed At":`${new Date().toLocaleDateString('en-IN')} - ${new Date().toLocaleTimeString('en-IN')}`,"Compliacnes":compliancesCount})
    command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'calendars_log_' + projectid + '.json',
        Body: JSON.stringify(statsObj),
        ContentType: 'application/json'
    });
    responseS3;
    try {
        responseS3 = await s3Client.send(command);
    } catch (err) {
        console.log('calendar log writing err', err);
        responseS3 = err;
    }
    if(jsonFunctionheadsData.mappings.mappings.length >= ((parseInt(startIndex) + 1) * CALENDAR_PROCESS_BLOCK_SIZE)){
        for(i = 0; i < Object.keys(arrReportersEvents).length; i++) {
            
            const key = Object.keys(arrReportersEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrReportersEvents[key])
            var encryptedData = await processEncryptData(projectid, jsonStr)
            var responseS3;
            var command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_reporter_calendar_job_' + startIndex + '_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            //   console.log('file written', command);
            } catch (err) {
                console.log('writing err', err);
              responseS3 = err;
            }
            
        }
        for(i = 0; i < Object.keys(arrApproversEvents).length; i++) {
            
            const key = Object.keys(arrApproversEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrApproversEvents[key])
            encryptedData = await processEncryptData(projectid, jsonStr)
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_approver_calendar_job_' + startIndex + '_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
        }
        
        for(i = 0; i < Object.keys(arrFunctionHeadsEvents).length; i++) {
            const key = Object.keys(arrFunctionHeadsEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrFunctionHeadsEvents[key])
            encryptedData = await processEncryptData(projectid, jsonStr)
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_functionhead_calendar_job_' + startIndex + '_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
        }
        for(i = 0; i < Object.keys(arrAuditorsEvents).length; i++) {
            
            const key = Object.keys(arrAuditorsEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrAuditorsEvents[key])
            encryptedData = await processEncryptData(projectid, jsonStr)
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_auditor_calendar_job_' + startIndex + '_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
        }
        for(i = 0; i < Object.keys(arrViewersEvents).length; i++) {
            
            const key = Object.keys(arrViewersEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrViewersEvents[key])
            encryptedData = await processEncryptData(projectid, jsonStr)
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_viewer_calendar_job_' + startIndex + '_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
        }
        console.log('total', jsonFunctionheadsData.mappings.mappings.length);
        console.log('next job params', JSON.stringify({"projectid":projectid, "userid": userid, "year":year, "contractstartdate": contractstartdate, "startindex": (parseInt(startIndex) + 1) + ""}))
        //Scheduler schedules next Job
        
        let currentTime = new Date().getTime()
        let scheduleDate = new Date(currentTime + 10*1000);
        let inputObj = {
            path:event["path"] ?? event["rawPath"],
            body:JSON.stringify({
                projectid: projectid,
                year: year,
                userid: userid,
                contractstartdate: contractstartdate,
                startindex: (parseInt(startIndex) + 1) + "",
                requestid: newUuidV4()
            }),
            headers: event["headers"]
        }
        let inputStr = JSON.stringify(inputObj)
        const input = { // CreateScheduleInput
            Name: "RULE_Cal_" + userid + "_" + startIndex + "_" + (new Date().getTime()), // required
            ScheduleExpression: "at(" + scheduleDate.toISOString().split('.')[0] + ")", // required
            Target: { // Target
                Arn: "arn:aws:lambda:us-east-1:181895849565:function:F_sf-i-events_FlaggGRC-Events_1683434598476_test", // required
                RoleArn: "arn:aws:iam::181895849565:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_88907155fe", // required
                RetryPolicy: { // RetryPolicy
                    MaximumEventAgeInSeconds: Number(24*60*60),
                    MaximumRetryAttempts: Number(185),
                },
                Input: inputStr,
            },
            FlexibleTimeWindow: { // FlexibleTimeWindow
                Mode: "OFF", // required
            },
            ActionAfterCompletion: "DELETE"
        };
          
        const scheduleCommand = new CreateScheduleCommand(input);
        let responseScheduler = await schedulerClient.send(scheduleCommand);
        console.log('responseScheduler', responseScheduler);
        // let bodyHtml = JSON.stringify(event) + '<br /><br />' + inputStr
        // let subject = `Calendar Job Scheduled - ${startIndex} - ${new Date().toLocaleDateString('en-IN')} - ${new Date().toLocaleTimeString('en-IN')}`
        // let to = "hrushi@flagggrc.tech, ninad.t@flagggrc.tech"
        // await processSendEmail(to, subject, '', bodyHtml);
    } else {
        for(i = 0; i < parseInt(startIndex); i++){
            console.log('parsing files', i, startIndex)
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + userid + '_' + year + '_reporter_calendar_job_' + i + '_enc.json',
            });
            var flagError = false
            var jsonData = {};
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
                jsonData = jsonContent;
                
            } catch (err) {
                console.log('read error', startIndex, err)
                flagError = true
            }
            
            arrReportersEvents = combineCalendarArray(arrReportersEvents, jsonData, userid)
            if(!flagError){
                command = new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: projectid + '_' + userid + '_' + year + '_reporter_calendar_job_' + i + '_enc.json',
                }) 
                
                try {
                    await s3Client.send(command);
                } catch (err) {
                    console.log('delete error', startIndex, err)
                }
            }
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + userid + '_' + year + '_approver_calendar_job_' + i + '_enc.json',
            });
            flagError = false;
            jsonData = {};
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
                jsonData = jsonContent;
                
            } catch (err) {
                // console.log('read error', startIndex, err)
                flagError = true;
            }
            
            arrApproversEvents = combineCalendarArray(arrApproversEvents, jsonData, userid)
            if(!flagError){
                command = new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: projectid + '_' + userid + '_' + year + '_approver_calendar_job_' + i + '_enc.json',
                }) 
                
                try {
                    await s3Client.send(command);
                } catch (err) {
                    // console.log('delete error', startIndex, err)
                }
            }
            
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + userid + '_' + year + '_functionhead_calendar_job_' + i + '_enc.json',
            });
            flagError = false;
            jsonData = {};
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
                jsonData = jsonContent;
                
            } catch (err) {
                // console.log('read error', startIndex, err)
                flagError = true;
            }
            
            arrFunctionHeadsEvents = combineCalendarArray(arrFunctionHeadsEvents, jsonData, userid)
            if(!flagError){
                command = new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: projectid + '_' + userid + '_' + year + '_functionhead_calendar_job_' + i + '_enc.json',
                }) 
                
                try {
                    await s3Client.send(command);
                } catch (err) {
                    // console.log('delete error', startIndex, err)
                }
            }
            
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + userid + '_' + year + '_auditor_calendar_job_' + i + '_enc.json',
            });
            flagError = false;
            jsonData = {};
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
                jsonData = jsonContent;
                
            } catch (err) {
                // console.log('read error', startIndex, err)
                flagError = true
            }
            
            arrAuditorsEvents = combineCalendarArray(arrAuditorsEvents, jsonData, userid)
            if(!flagError){
                command = new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: projectid + '_' + userid + '_' + year + '_auditor_calendar_job_' + i + '_enc.json',
                }) 
                
                try {
                    await s3Client.send(command);
                } catch (err) {
                    // console.log('delete error', startIndex, err)
                }
            }
            
            command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + userid + '_' + year + '_viewer_calendar_job_' + i + '_enc.json',
            });
            flagError = false;
            jsonData = {};
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
                jsonData = jsonContent;
                
            } catch (err) {
                // console.log('read error', startIndex, err)
                flagError = true;
            }
            
            arrViewersEvents = combineCalendarArray(arrViewersEvents, jsonData, userid)
            if(!flagError){
                command = new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: projectid + '_' + userid + '_' + year + '_viewer_calendar_job_' + i + '_enc.json',
                }) 
                
                try {
                    await s3Client.send(command);
                } catch (err) {
                    // console.log('delete error', startIndex, err)
                }
            }
            
        }
        for(i = 0; i < Object.keys(arrReportersEvents).length; i++) {
            
            const key = Object.keys(arrReportersEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrReportersEvents[key])
            var encryptedData = await processEncryptData(projectid, jsonStr)
            var responseS3;
            var command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_reporter_calendar_job_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
            for(let mm = 1; mm <= 12; mm ++){
                let objMonthly = {}
                for(let mmddyyyy of Object.keys(arrReportersEvents[key])){
                    if(mmddyyyy.split('/')[0] == ("0" + mm).slice(-2)){
                        objMonthly[mmddyyyy] = arrReportersEvents[key][mmddyyyy]
                    }
                }
                if(Object.keys(objMonthly).length == 0){
                    continue;
                }
                let jsonStr = JSON.stringify(objMonthly)
                encryptedData = await processEncryptData(projectid, jsonStr)
                responseS3;
                command = new PutObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: projectid + '_' + key + '_' + year + '_reporter_calendar_' + ("0" + mm).slice(-2) + '_job_enc.json',
                  Body: encryptedData,
                  ContentType: 'application/json'
                });
                
                try {
                  responseS3 = await s3Client.send(command);
                } catch (err) {
                  responseS3 = err;
                }
            }
        }
        for(i = 0; i < Object.keys(arrApproversEvents).length; i++) {
            
            const key = Object.keys(arrApproversEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrApproversEvents[key])
            encryptedData = await processEncryptData(projectid, jsonStr)
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_approver_calendar_job_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
            for(let mm = 1; mm <= 12; mm ++){
                let objMonthly = {}
                for(let mmddyyyy of Object.keys(arrApproversEvents[key])){
                    if(mmddyyyy.split('/')[0] == ("0" + mm).slice(-2)){
                        objMonthly[mmddyyyy] = arrApproversEvents[key][mmddyyyy]
                    }
                }
                if(Object.keys(objMonthly).length == 0){
                    continue;
                }
                let jsonStr = JSON.stringify(objMonthly)
                encryptedData = await processEncryptData(projectid, jsonStr)
                responseS3;
                command = new PutObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: projectid + '_' + key + '_' + year + '_approver_calendar_' + ("0" + mm).slice(-2) + '_job_enc.json',
                  Body: encryptedData,
                  ContentType: 'application/json'
                });
                
                try {
                  responseS3 = await s3Client.send(command);
                } catch (err) {
                  responseS3 = err;
                }
            }
        }
        
        for(i = 0; i < Object.keys(arrFunctionHeadsEvents).length; i++) {
            const key = Object.keys(arrFunctionHeadsEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrFunctionHeadsEvents[key])
            encryptedData = await processEncryptData(projectid, jsonStr)
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_functionhead_calendar_job_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
            for(let mm = 1; mm <= 12; mm ++){
                let objMonthly = {}
                for(let mmddyyyy of Object.keys(arrFunctionHeadsEvents[key])){
                    if(mmddyyyy.split('/')[0] == ("0" + mm).slice(-2)){
                        objMonthly[mmddyyyy] = arrFunctionHeadsEvents[key][mmddyyyy]
                    }
                }
                if(Object.keys(objMonthly).length == 0){
                    continue;
                }
                let jsonStr = JSON.stringify(objMonthly)
                encryptedData = await processEncryptData(projectid, jsonStr)
                responseS3;
                command = new PutObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: projectid + '_' + key + '_' + year + '_functionhead_calendar_' + ("0" + mm).slice(-2) + '_job_enc.json',
                  Body: encryptedData,
                  ContentType: 'application/json'
                });
                
                try {
                  responseS3 = await s3Client.send(command);
                } catch (err) {
                  responseS3 = err;
                }
            }
        }
        for(i = 0; i < Object.keys(arrAuditorsEvents).length; i++) {
            
            const key = Object.keys(arrAuditorsEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrAuditorsEvents[key])
            encryptedData = await processEncryptData(projectid, jsonStr)
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_auditor_calendar_job_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
            for(let mm = 1; mm <= 12; mm ++){
                let objMonthly = {}
                for(let mmddyyyy of Object.keys(arrAuditorsEvents[key])){
                    if(mmddyyyy.split('/')[0] == ("0" + mm).slice(-2)){
                        objMonthly[mmddyyyy] = arrAuditorsEvents[key][mmddyyyy]
                    }
                }
                if(Object.keys(objMonthly).length == 0){
                    continue;
                }
                let jsonStr = JSON.stringify(objMonthly)
                encryptedData = await processEncryptData(projectid, jsonStr)
                responseS3;
                command = new PutObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: projectid + '_' + key + '_' + year + '_auditor_calendar_' + ("0" + mm).slice(-2) + '_job_enc.json',
                  Body: encryptedData,
                  ContentType: 'application/json'
                });
                
                try {
                  responseS3 = await s3Client.send(command);
                } catch (err) {
                  responseS3 = err;
                }
            }
        }
        for(i = 0; i < Object.keys(arrViewersEvents).length; i++) {
            
            const key = Object.keys(arrViewersEvents)[i];
            if(key != userid){
                continue;
            }
            let jsonStr = JSON.stringify(arrViewersEvents[key])
            encryptedData = await processEncryptData(projectid, jsonStr)
            command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: projectid + '_' + key + '_' + year + '_viewer_calendar_job_enc.json',
              Body: encryptedData,
              ContentType: 'application/json'
            });
            
            try {
              responseS3 = await s3Client.send(command);
            } catch (err) {
              responseS3 = err;
            }
            
            for(let mm = 1; mm <= 12; mm ++){
                let objMonthly = {}
                for(let mmddyyyy of Object.keys(arrViewersEvents[key])){
                    if(mmddyyyy.split('/')[0] == ("0" + mm).slice(-2)){
                        objMonthly[mmddyyyy] = arrViewersEvents[key][mmddyyyy]
                    }
                }
                if(Object.keys(objMonthly).length == 0){
                    continue;
                }
                let jsonStr = JSON.stringify(objMonthly)
                encryptedData = await processEncryptData(projectid, jsonStr)
                responseS3;
                command = new PutObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: projectid + '_' + key + '_' + year + '_viewer_calendar_' + ("0" + mm).slice(-2) + '_job_enc.json',
                  Body: encryptedData,
                  ContentType: 'application/json'
                });
                
                try {
                  responseS3 = await s3Client.send(command);
                } catch (err) {
                  responseS3 = err;
                }
            }
        }
        
        await processGenerateUserMap(event);
    }
    
    const response = {statusCode: 200, body: {result: true}};
    return response;
}

function sortUsermapRoles(obj) {
  if (typeof obj !== "object" || Array.isArray(obj))
    return obj;
  const sortedObject = {};
  var ordering = {} // map for efficient lookup of sortIndex
    for (var i=0; i<ROLES_ORDER.length; i++)
        ordering[ROLES_ORDER[i]] = i;
  const keys = Object.keys(obj).sort((a,b) => {
        return (ordering[a] - ordering[b]);
  });
  keys.forEach(key => sortedObject[key] = obj[key]);
  return sortedObject;
}