import { PutObjectCommand, s3Client, BUCKET_NAME, GetObjectCommand, RANDOM_NUMBER_MAX_LIMIT } from "./globals.mjs";
export const processCheckRequestid = async (requestid) => {
    console.log('checking', requestid)
    if(requestid == null){
        return true;
    }
    let randomNumber = Math.floor(Math.random() * (RANDOM_NUMBER_MAX_LIMIT + 1));
    // console.log('random Number', randomNumber)
    if(randomNumber % RANDOM_NUMBER_MAX_LIMIT == 0){
      await cleanRequestIdStorage();
    }
    var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'requestidslist.json',
    });
      
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
        console.log("req list read error",err); 
    } 
    // console.log('data', jsonData, jsonData[requestid])
    if(jsonData[requestid] == null){
        jsonData[requestid] = new Date().getTime();
        command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: 'requestidslist.json',
            Body: JSON.stringify(jsonData),
            ContentType: 'application/json'
        });
          
        try {
            await s3Client.send(command);
        } catch (err) {
            console.log("token save error",err);
        }
        // console.log('returning true')
        return true;
    }else{
        console.log('returning false')
        return false;
    }
    
    
}

async function cleanRequestIdStorage () {
  var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'requestidslist.json',
  });
  
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
      console.log("token read error",err); 
  } 
  let currTime = new Date().getTime()
  for(let requestid of Object.keys(jsonData)){
    if(jsonData[requestid] < (currTime - 24 * 60 * 60 * 1000)){
      delete jsonData[requestid]
    }
  }
  
  command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'requestidslist.json',
      Body: JSON.stringify(jsonData),
      ContentType: 'application/json'
  });
  
  try {
      await s3Client.send(command);
  } catch (err) {
      console.log("token save error",err);
  }
}