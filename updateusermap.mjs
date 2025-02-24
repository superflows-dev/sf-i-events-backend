import https from 'https';
import { AUTH_REGION, USERPROFILE_API } from "./globals.mjs";

export const processUpdateUserMap = async (authorization, userid, usermap) => {
  
  let myPromise = new Promise(function(resolve) {
    
    var options = {
       host: USERPROFILE_API + '.lambda-url.' + AUTH_REGION + '.on.aws',
       port: 443,
       method: 'POST',
       path: '/updatefield',
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
          // console.log('usermap update response',data);
          const body = JSON.parse(data);
          resolve(body)
      });
    })
    
    request.on('error', error => {
      console.log('error', error)
      resolve(error);
    })
    const map = usermap[userid];
    // console.log('map', JSON.stringify(map));
    const strMap = JSON.stringify(map).replace(/"/g, '_QUOTES_');
    // console.log('params', '{"id":"' + userid + '","field":"usermap","value":"\\\"' + strMap + '\\\""}')
    request.write('{"id":"' + userid + '","field":"usermap","value":"\\"' + strMap + '\\""}');
    request.end()
    
  });
  
  return myPromise;

}