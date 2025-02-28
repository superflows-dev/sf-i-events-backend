import { processAuthenticate } from './authenticate.mjs'
import { s3Client, BUCKET_NAME, GetObjectCommand, BUCKET_FOLDER_STATISTICS } from './globals.mjs'
import { processDecryptData } from './decryptdata.mjs'
import { processGetUserLastTime } from './getuserlasttime.mjs'
import { Buffer } from 'buffer'
export const processGetStatistics = async (event) => {
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
    var userid = null;
    var role = null;
    var sdate = null;
    var edate = null;
    var filtercriteria = null
    var filteruserrole = null;
    var filteruserid = null;
    var functionid = null;
    var locationid = null;
    // var subfiltercriteria = null;
    // var subfilterid = null;
    try {
        projectid = JSON.parse(event.body).projectid.trim();
        userid = JSON.parse(event.body).userid;
        role = JSON.parse(event.body).role;
        sdate = JSON.parse(event.body).sdate ?? null;
        edate = JSON.parse(event.body).edate ?? null;
        filtercriteria = JSON.parse(event.body).filtercriteria ?? "";
        filteruserrole = JSON.parse(event.body).filteruserrole;
        filteruserid = JSON.parse(event.body).filteruserid ?? null;
        functionid = JSON.parse(event.body).functionid ?? null;
        locationid = JSON.parse(event.body).locationid ?? null;
        // subfiltercriteria = JSON.parse(event.body).subfiltercriteria ?? "";
        // subfilterid = JSON.parse(event.body).subfilterid ?? null;

    } catch (e) {
        console.log(e);
        const response = {statusCode: 400, body: { result: false, error: "Malformed body!"}};
        //processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    if(projectid == null || projectid == "" || projectid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    if(userid == null || userid == "" || userid.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "User Id is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    if(role == null || role == "" || role.length < 6) {
        const response = {statusCode: 400, body: {result: false, error: "Role is not valid!"}}
       // processAddLog(userId, 'detail', event, response, response.statusCode)
        return response;
    }
    
    let userLastTimeData = {};
    let userStatisticsFileKey = BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_all_enc.json'
    let userStatisticsMetaFileKey = BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_meta_enc.json'
    if(filteruserid != null && filteruserid != ""){
        
        userStatisticsFileKey = BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_' + filteruserrole + '_' + filteruserid + '_enc.json'
    }else if(functionid != null && functionid != ""){
        userStatisticsFileKey = BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_function_' + functionid + '_enc.json'
    }else if(locationid != null && locationid != ""){
        userStatisticsFileKey = BUCKET_FOLDER_STATISTICS + '/' + projectid + '_' + userid + '_' + role + '_stats_location_' + locationid + '_enc.json'
    }
    
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: userStatisticsFileKey,
    });
    
    let responseS3;
    let userstatistics = {}
    let lastupdated = ""
    try {
        responseS3 = await s3Client.send(command);
        lastupdated = responseS3.LastModified
        const s3ResponseStream = responseS3.Body;
        const chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        const responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        userstatistics = JSON.parse(decryptedData);
        
    } catch (err) {
      console.log('err starts', err, command.Key);
    }
    
    let arrStatistics = {}
    let arrStatisticsFiltersData = {}
    for(let mmddyyyy of Object.keys(userstatistics)){
        if(mmddyyyy == 'filtersdata'){
            continue;
        }
        if(mmddyyyy == "00/00") continue;
        const mm = mmddyyyy.split('/')[0];
        const dd = mmddyyyy.split('/')[1];
        const yyyy = mmddyyyy.split('/')[2];
        
        if(sdate != null && edate != null){
            
            const startTime = new Date(sdate.split('/')[2], parseInt(sdate.split('/')[0]-1), sdate.split('/')[1]).getTime();
            const endTime = new Date(edate.split('/')[2], parseInt(edate.split('/')[0]-1), edate.split('/')[1]).getTime();
            const currTime = new Date(yyyy, parseInt(mm) - 1, dd).getTime()
            
            if(currTime > endTime || currTime < startTime) {
                continue;
            }
        }
        if(mmddyyyy == "subfilters"){
            let arrSubStatistics = {}
            for(let subfilter of Object.keys(userstatistics[mmddyyyy])){
                arrSubStatistics[subfilter] = {}
                for(let submmddyyyy of Object.keys(userstatistics[mmddyyyy][subfilter])){
                    const submm = submmddyyyy.split('/')[0];
                    const subdd = submmddyyyy.split('/')[1];
                    const subyyyy = submmddyyyy.split('/')[2];
                    if(sdate != null && edate != null){
            
                        const startTime = new Date(sdate.split('/')[2], parseInt(sdate.split('/')[0]-1), sdate.split('/')[1]).getTime();
                        const endTime = new Date(edate.split('/')[2], parseInt(edate.split('/')[0]-1), edate.split('/')[1]).getTime();
                        const currTime = new Date(subyyyy, parseInt(submm) - 1, subdd).getTime()
                        
                        if(currTime > endTime || currTime < startTime) {
                            continue;
                        }
                    }
                    arrSubStatistics[subfilter][submm + '/' + subdd] = userstatistics[mmddyyyy][subfilter][submmddyyyy]
                }
            }
            arrStatistics[mmddyyyy] = arrSubStatistics
        }else{
            arrStatistics[mm + '/' + dd] = userstatistics[mmddyyyy]
        }
    }
    
    
    if((filteruserid == null || filteruserid == "") && (functionid == null || functionid == "") && (locationid == null || locationid == "")){
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: userStatisticsMetaFileKey,
        });
        
        let responseS3;
        let userstatisticsmeta = {}
        try {
            responseS3 = await s3Client.send(command);
            const s3ResponseStream = responseS3.Body;
            const chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            const responseBuffer = Buffer.concat(chunks)
            let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
            userstatisticsmeta = JSON.parse(decryptedData);
            
        } catch (err) {
          console.log('err meta', err, command.Key);
        }
        let criterias = []
        if(filtercriteria == "all"){
            for(let objKey of Object.keys(userstatisticsmeta)){
                if(objKey != "subfilters"){
                    criterias.push(objKey)
                }
            }
        }else{
            criterias = [filtercriteria]
        }
        userLastTimeData = await processGetUserLastTime(projectid);
        for(let criteria of criterias){
            if(userstatistics['filtersdata'] != null && userstatistics['filtersdata'][criteria] != null && criteria !== ""){
            
                for(let filter of Object.keys(userstatistics['filtersdata'][criteria])){
                    for(let mmddyyyy of Object.keys(userstatistics['filtersdata'][criteria][filter])){
                        if(mmddyyyy == "00/00") continue;
                        const mm = mmddyyyy.split('/')[0];
                        const dd = mmddyyyy.split('/')[1];
                        const yyyy = mmddyyyy.split('/')[2];
                        
                        if(sdate != null && edate != null){
                            
                            const startTime = new Date(sdate.split('/')[2], parseInt(sdate.split('/')[0]-1), sdate.split('/')[1]).getTime();
                            const endTime = new Date(edate.split('/')[2], parseInt(edate.split('/')[0]-1), edate.split('/')[1]).getTime();
                            const currTime = new Date(yyyy, parseInt(mm) - 1, dd).getTime()
                            
                            if(currTime > endTime || currTime < startTime) {
                                continue;
                            }
                        }
                        if(arrStatisticsFiltersData[criteria] == null){
                            arrStatisticsFiltersData[criteria] = {}
                        }
                        if(arrStatisticsFiltersData[criteria][filter] == null){
                            arrStatisticsFiltersData[criteria][filter] = {}
                        }
                        if(userLastTimeData[filter] != null){
                            let tempObj = {}
                            for(let timekey of Object.keys(userLastTimeData[filter])){
                                tempObj[timekey] = timeSince(userLastTimeData[filter][timekey])
                            }
                            arrStatisticsFiltersData[criteria][filter]['lasttime'] = tempObj
                        }
                        if(mmddyyyy == "subfilters"){
                            let arrSubStatistics = {}
                            for(let subfilter of Object.keys(userstatistics['filtersdata'][criteria][filter][mmddyyyy])){
                                arrSubStatistics[subfilter] = {}
                                for(let submmddyyyy of Object.keys(userstatistics['filtersdata'][criteria][filter][mmddyyyy][subfilter])){
                                    const submm = submmddyyyy.split('/')[0];
                                    const subdd = submmddyyyy.split('/')[1];
                                    const subyyyy = submmddyyyy.split('/')[2];
                                    if(sdate != null && edate != null){
                            
                                        const startTime = new Date(sdate.split('/')[2], parseInt(sdate.split('/')[0]-1), sdate.split('/')[1]).getTime();
                                        const endTime = new Date(edate.split('/')[2], parseInt(edate.split('/')[0]-1), edate.split('/')[1]).getTime();
                                        const currTime = new Date(subyyyy, parseInt(submm) - 1, subdd).getTime()
                                        
                                        if(currTime > endTime || currTime < startTime) {
                                            continue;
                                        }
                                    }
                                    arrSubStatistics[subfilter][submm + '/' + subdd] = userstatistics['filtersdata'][criteria][filter][mmddyyyy][subfilter][submmddyyyy]
                                }
                            }
                            arrStatisticsFiltersData[criteria][filter][mmddyyyy] = arrSubStatistics
                        }else{
                            arrStatisticsFiltersData[criteria][filter][mm + '/' + dd] = userstatistics['filtersdata'][criteria][filter][mmddyyyy]
                        }
                        
                    }
                }
                for(let filter of userstatisticsmeta[criteria]){
                    let filterid = filter.split(';')[1]
                    if(arrStatisticsFiltersData[criteria][filterid] == null){
                        arrStatisticsFiltersData[criteria][filterid] = {}
                    }
                }
            }
        }
        console.log('filtersDate', Object.keys(arrStatisticsFiltersData));
        const response = {statusCode: 200, body: {result: true, data:arrStatistics , meta: userstatisticsmeta, lastupdated: lastupdated, filtersdata: arrStatisticsFiltersData}};
        return response;
    }else{
        const response = {statusCode: 200, body: {result: true, data: arrStatistics, lastupdated: lastupdated}};
        return response;
    }
}

const timeSince = (lasttime) => {

    var seconds = Math.floor((new Date().getTime() - lasttime) / 1000);

    if(seconds > 0) {

      var interval = seconds / 31536000;
    
      if (interval > 1) {
        return Math.floor(interval) + " years ago";
      }
      interval = seconds / 2592000;
      if (interval > 1) {
        return Math.floor(interval) + " months ago";
      }
      interval = seconds / 86400;
      if (interval > 1) {
        return Math.floor(interval) + " days ago";
      }
      interval = seconds / 3600;
      if (interval > 1) {
        return Math.floor(interval) + " hours ago";
      }
      interval = seconds / 60;
      if (interval > 1) {
        return Math.floor(interval) + " minutes ago";
      }
      return Math.floor(seconds) + " seconds ago";

    } else {

      interval = Math.abs(seconds) / 31536000;


      console.log('timesince', seconds);
      
      
      console.log('interval year', interval);
      if (interval > 1) {
        return Math.floor(interval) + " years later";
      }
      interval = Math.abs(seconds) / 2592000;
      console.log('interval months', interval);
      if (interval > 1) {
        return Math.floor(interval) + " months later";
      }

      interval = Math.abs(seconds) / 86400;
      console.log('interval days', interval);
      if (interval > 1) {
        return Math.floor(interval) + " days later";
      }
      
      interval = Math.abs(seconds) / 3600;
      console.log('interval hours', interval);
      if (interval > 1) {
        return Math.floor(interval) + " hours later";
      }
      interval = Math.abs(seconds) / 60;
      if (interval > 1) {
        return Math.floor(interval) + " minutes later";
      }
      return Math.floor(Math.abs(seconds)) + " seconds";

    }
  }