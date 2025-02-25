import { PutObjectCommand, s3Client, BUCKET_NAME } from "./globals.mjs";
export const processAddLog = async (userId, op, req, resp, httpCode, delta = null) => {
    
    // a client can be shared by different commands.
    // const client = new CloudWatchLogsClient({ region: REGION });
    
    // const params = {
    //    "logEvents": [ 
    //         { 
    //          "message": JSON.stringify({userId: userId, op: op, req: req, resp: resp, httpCode: httpCode, delta: delta}),
    //          "timestamp": new Date().getTime()
    //         }
    //     ],
    //     "logGroupName": LOG_GROUP_NAME,
    //     "logStreamName": "log",
    //     "sequenceToken": newUuidV4()
    // };
    // const command = new PutLogEventsCommand(params);
    
    // var data;
    // // async/await.
    // try {
    //   data = await client.send(command);
    //   // process data.
    // } catch (error) {
    //   // error handling.
    //   console.log('error', error);
    // } finally {
    //   // finally.
    // }
    let logObject = {userId: userId, op: op, req: req, resp: resp, httpCode: httpCode, delta: delta}
    
    var d = new Date();
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    let year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;
    
    let logData = JSON.stringify(logObject)
    let command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: "Logs" + '/' + year + '/' + month + '/' + d.getTime() + '_log.json',
        Body: logData,
        ContentType: 'application/json'
    });
    
    try {
        await s3Client.send(command);
    } catch (err) {
        console.log("log error",err);
    }
    return {statusCode: 200, body: {result: true}};

}