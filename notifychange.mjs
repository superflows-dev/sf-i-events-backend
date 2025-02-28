import https from 'https';
import { NOTIFY_REGION, NOTIFY_API } from "./globals.mjs";

export const processNotifyChange = async (authorization, body, path) => {
  
  let myPromise = new Promise(function(resolve) {
    
    var options = {
       host: NOTIFY_API + '.lambda-url.' + NOTIFY_REGION + '.on.aws',
       port: 443,
       method: 'POST',
       path: path,
       headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json'
       }   
    };
    
    // console.log(options);
    // console.log(authorization);
    // console.log('notify body', JSON.stringify(body));
    
    //this is the call
    var request = https.request(options, function(response){
      let data = '';
      response.on('data', (chunk) => {
          data = data + chunk.toString();
      });
    
      response.on('end', () => {
          const body = (data);
          // console.log('success', body);
          resolve(body)
      });
    })
    
    request.on('error', error => {
      console.log('error', error)
      resolve(error);
    })
    
    request.write(JSON.stringify(body));
    request.end() 
    
  });
  
  return myPromise;

}