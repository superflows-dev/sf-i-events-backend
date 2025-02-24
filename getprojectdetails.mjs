import https from 'https';
import { AUTH_REGION, PROJECT_API, PROJECT_DETAIL_PATH } from "./globals.mjs";

export const processGetProjectDetails = async (authorization, body) => {
  
  let myPromise = new Promise(function(resolve, reject) {
    
    var options = {
       host: PROJECT_API + '.lambda-url.' + AUTH_REGION + '.on.aws',
       port: 443,
       method: 'POST',
       path: PROJECT_DETAIL_PATH,
       headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json'
       }   
    };
    
    // console.log(options);
    // console.log(authorization);
    // console.log(body);
    
    //this is the call
    var request = https.request(options, function(response){
      let data = '';
      response.on('data', (chunk) => {
          data = data + chunk.toString();
      });
    
      response.on('end', () => {
          const body = JSON.parse(data);
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