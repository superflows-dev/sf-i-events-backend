import https from 'https';
import { AUTH_REGION, AUTH_API, PutObjectCommand, s3Client, BUCKET_NAME, GetObjectCommand, RANDOM_NUMBER_MAX_LIMIT } from "./globals.mjs";

export const processAuthenticate = async (authorization) => {
  
  let myPromise = new Promise(async function(resolve, reject) {
    let randomNumber = Math.floor(Math.random() * (RANDOM_NUMBER_MAX_LIMIT + 1));
    console.log('random Number', randomNumber)
    if(randomNumber % RANDOM_NUMBER_MAX_LIMIT == 0){
      console.log('cleaning storage')
      await cleanTokenStorage();
    }
    let localTokenResponse = await checkTokenInStorage(authorization);
    if(localTokenResponse != null){
      resolve(localTokenResponse);
      return;
    }
    var options = {
       host: AUTH_API + '.lambda-url.' + AUTH_REGION + '.on.aws',
       port: 443,
       method: 'POST',
       path: '/validate',
       headers: {
          'Authorization': authorization
       }   
    };
    
    // console.log(options);
    
    //this is the call
    var request = https.get(options, function(response){
      let data = '';
      response.on('data', (chunk) => {
          data = data + chunk.toString();
      });
    
      response.on('end', async () => {
          const body = JSON.parse(data);
          console.log('success', body);
          await addTokenToStorage(authorization, body);
          resolve(body)
      });
    })
    
    request.on('error', error => {
      console.log('error', error)
      resolve(error);
    })
    
    request.end()
    
  });
  
  return myPromise;

}

async function checkTokenInStorage (authorization) {
  var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'tokenslist.json',
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
  
  
  let currTime = new Date().getTime();
  if(jsonData[authorization] != null){
    if(jsonData[authorization].expiry >= currTime){
      return jsonData[authorization]
    }
  }
  return;
}

async function addTokenToStorage (authorization, body) {
  var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'tokenslist.json',
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
  
  let saveBody = body;
  let currTime = new Date().getTime();
  
  saveBody.expiry = currTime + (24 * 60 * 60 * 1000);
  jsonData[authorization] = saveBody
  
  command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'tokenslist.json',
      Body: JSON.stringify(jsonData),
      ContentType: 'application/json'
  });
  
  try {
      await s3Client.send(command);
  } catch (err) {
      console.log("token save error",err);
  }
}
async function cleanTokenStorage () {
  var command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'tokenslist.json',
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
  for(let authorization of Object.keys(jsonData)){
    if(jsonData[authorization].expiry < currTime){
      delete jsonData[authorization]
    }
  }
  
  command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'tokenslist.json',
      Body: JSON.stringify(jsonData),
      ContentType: 'application/json'
  });
  
  try {
      await s3Client.send(command);
  } catch (err) {
      console.log("token save error",err);
  }
}