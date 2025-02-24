import { schedulerClient, CreateScheduleCommand, s3Client, BUCKET_NAME, GetObjectCommand } from './globals.mjs'
import { processAuthenticate } from './authenticate.mjs'
import { processDecryptData } from './decryptdata.mjs'
import { newUuidV4 } from './newuuid.mjs';
export const processScheduleGetCalendarJob = async (event) => {
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
    var contractstartdate = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
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
    var chunkIndex = null;
    var chunkSize = null;
    try {
        chunkIndex = JSON.parse(event.body).chunkindex;
        chunkSize = JSON.parse(event.body).chunksize;
    } catch (e) {
        chunkIndex = null;
        chunkSize = null;
    }
    
    let arrUsers = []
    
    var fileKey = projectid + '_reporters_job_enc.json';
    let flagEncryptedNotFound = false        
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    let jsonContentReporters = {}
    try {
        let response = await s3Client.send(command);
        let s3ResponseStream = response.Body;
        let chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        let responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        jsonContentReporters = JSON.parse(decryptedData);
    } catch (err) {
      console.error(err);
      flagEncryptedNotFound = true
    }
    console.log('flagEncryptedNotFound', flagEncryptedNotFound);
    if(flagEncryptedNotFound){
        fileKey = projectid + '_reporters_job.json';
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          ContentType: 'application/json'
        });
        try {
            let response = await s3Client.send(command);
            let s3ResponseStream = response.Body;
            let chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            let responseBuffer = Buffer.concat(chunks)
            let decryptedData = responseBuffer.toString()
            jsonContentReporters = JSON.parse(decryptedData);
        } catch (err) {
          console.error(err);
        }
    }
    
    for(const userMapping of jsonContentReporters['mappings']){
        for(const user of userMapping['reporters']){
          if(arrUsers.indexOf(user.split(';')[1]) < 0){
            arrUsers.push(user.split(';')[1])
          }
        }
    }
    
    fileKey = projectid + '_approvers_job_enc.json';
    flagEncryptedNotFound = false        
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    let jsonContentApprovers = {}
    try {
        let response = await s3Client.send(command);
        let s3ResponseStream = response.Body;
        let chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        let responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        jsonContentApprovers = JSON.parse(decryptedData);
    } catch (err) {
      console.error(err);
      flagEncryptedNotFound = true
    }
    console.log('flagEncryptedNotFound', flagEncryptedNotFound);
    if(flagEncryptedNotFound){
        fileKey = projectid + '_approvers_job.json';
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          ContentType: 'application/json'
        });
        try {
            let response = await s3Client.send(command);
            let s3ResponseStream = response.Body;
            let chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            let responseBuffer = Buffer.concat(chunks)
            let decryptedData = responseBuffer.toString()
            jsonContentApprovers = JSON.parse(decryptedData);
        } catch (err) {
          console.error(err);
        }
    }
    
    for(const [i,userMapping] of jsonContentApprovers['mappings'].entries()){
      console.log('usermapping', userMapping['approvers'], i, fileKey);
        for(const user of userMapping['approvers']){
          if(arrUsers.indexOf(user.split(';')[1]) < 0){
            arrUsers.push(user.split(';')[1])
          }
        }
    }
    
    fileKey = projectid + '_functionheads_job_enc.json';
    flagEncryptedNotFound = false        
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    let jsonContentFunctionheads = {}
    try {
        let response = await s3Client.send(command);
        let s3ResponseStream = response.Body;
        let chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        let responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        jsonContentFunctionheads = JSON.parse(decryptedData);
    } catch (err) {
      console.error(err);
      flagEncryptedNotFound = true
    }
    console.log('flagEncryptedNotFound', flagEncryptedNotFound);
    if(flagEncryptedNotFound){
        fileKey = projectid + '_functionheads_job.json';
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          ContentType: 'application/json'
        });
        try {
            let response = await s3Client.send(command);
            let s3ResponseStream = response.Body;
            let chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            let responseBuffer = Buffer.concat(chunks)
            let decryptedData = responseBuffer.toString()
            jsonContentFunctionheads = JSON.parse(decryptedData);
        } catch (err) {
          console.error(err);
        }
    }
    
    for(const userMapping of jsonContentFunctionheads['mappings']){
        for(const user of userMapping['functionheads']){
          if(arrUsers.indexOf(user.split(';')[1]) < 0){
            arrUsers.push(user.split(';')[1])
          }
        }
    }
    
    fileKey = projectid + '_auditors_job_enc.json';
    flagEncryptedNotFound = false        
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    let jsonContentAuditors = {}
    try {
        let response = await s3Client.send(command);
        let s3ResponseStream = response.Body;
        let chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        let responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        jsonContentAuditors = JSON.parse(decryptedData);
    } catch (err) {
      console.error(err);
      flagEncryptedNotFound = true
    }
    console.log('flagEncryptedNotFound', flagEncryptedNotFound);
    if(flagEncryptedNotFound){
        fileKey = projectid + '_auditors_job.json';
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          ContentType: 'application/json'
        });
        try {
            let response = await s3Client.send(command);
            let s3ResponseStream = response.Body;
            let chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            let responseBuffer = Buffer.concat(chunks)
            let decryptedData = responseBuffer.toString()
            jsonContentAuditors = JSON.parse(decryptedData);
        } catch (err) {
          console.error(err);
        }
    }
    
    for(const userMapping of jsonContentAuditors['mappings']){
      console.log('auditors', userMapping['auditors'])
        for(const user of userMapping['auditors'] ?? []){
          if(arrUsers.indexOf(user.split(';')[1]) < 0){
            arrUsers.push(user.split(';')[1])
          }
        }
    }
    
    fileKey = projectid + '_viewers_job_enc.json';
    flagEncryptedNotFound = false        
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: 'application/json'
    });
    let jsonContentViewers = {}
    try {
        let response = await s3Client.send(command);
        let s3ResponseStream = response.Body;
        let chunks = []
        for await (const chunk of s3ResponseStream) {
            chunks.push(chunk)
        }
        let responseBuffer = Buffer.concat(chunks)
        let decryptedData = await processDecryptData(projectid, responseBuffer.toString())
        jsonContentViewers = JSON.parse(decryptedData);
    } catch (err) {
      console.error(err);
      flagEncryptedNotFound = true
    }
    console.log('flagEncryptedNotFound', flagEncryptedNotFound);
    if(flagEncryptedNotFound){
        fileKey = projectid + '_viewers_job.json';
        command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          ContentType: 'application/json'
        });
        try {
            let response = await s3Client.send(command);
            let s3ResponseStream = response.Body;
            let chunks = []
            for await (const chunk of s3ResponseStream) {
                chunks.push(chunk)
            }
            let responseBuffer = Buffer.concat(chunks)
            let decryptedData = responseBuffer.toString()
            jsonContentViewers = JSON.parse(decryptedData);
        } catch (err) {
          console.error(err);
        }
    }
    
    for(const userMapping of jsonContentViewers['mappings']){
        for(const user of userMapping['viewers'] ?? []){
          if(arrUsers.indexOf(user.split(';')[1]) < 0){
            arrUsers.push(user.split(';')[1])
          }
        }
    }
    
    
    console.log('arrUsers', arrUsers, arrUsers.length, chunkIndex, chunkSize)
    let index = 0
    for(let [index,userid] of arrUsers.entries()){
      if(chunkIndex != null && chunkSize != null){
        if(index < ((chunkIndex) * chunkSize) || index >= ((chunkIndex + 1) * chunkSize)){
          continue;
        }
      }
      let currentTime = new Date().getTime()
      let scheduleDate = new Date(currentTime + 1*60*1000);
      let inputObj = {
          path:"/getcalendaruser",
          body:JSON.stringify({
              projectid: projectid,
              year: year,
              userid: userid,
              contractstartdate: contractstartdate,
              requestid: newUuidV4()
          }),
          headers: event["headers"]
      }
      let inputStr = JSON.stringify(inputObj)
      const input = { // CreateScheduleInput
      Name: "RULE_Cal_" + projectid + "_" + index + "_" + (new Date().getTime()), // required
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
      await schedulerClient.send(scheduleCommand);
      index ++
    }
    
    let currentTime = new Date().getTime()
    let scheduleDate = new Date(currentTime + 1*60*1000);
    let inputObj = {
        path:"/getcalendarregister",
        body:JSON.stringify({
            projectid: projectid,
            year: year,          }),
        headers: event["headers"]
    }
    let inputStr = JSON.stringify(inputObj)
    const input = { // CreateScheduleInput
    Name: "RULE_Cal_" + projectid + "_Reg_" + (new Date().getTime()), // required
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
    await schedulerClient.send(scheduleCommand);
    
    const response = {statusCode: 200, body: {result: true}};
    return response;
}