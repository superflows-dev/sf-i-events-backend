import https from 'https';
import { AUTH_REGION, USERPROFILE_API } from "./globals.mjs";

export const processAuthorize = async (authorization, userId) => {
  
  let myPromise = new Promise(function(resolve, reject) {
    
    var options = {
       host: USERPROFILE_API + '.lambda-url.' + AUTH_REGION + '.on.aws',
       port: 443,
       method: 'POST',
       path: '/scanbyfield',
       headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json'
       }   
    };
    
    //this is the call
    var request = https.request(options, function(response){
      let data = '';
      response.on('data', (chunk) => {
          data = data + chunk.toString();
      });
    
      response.on('end', () => {
          console.log(data);
          const body = JSON.parse(data);
          resolve(body)
      });
    })
    
    request.on('error', error => {
      console.log('error', error)
      resolve(error);
    })
    
    request.write('{"field":"userid","value":"'+userId+'"}');
    request.end()
    
  });
  
  return myPromise;

}