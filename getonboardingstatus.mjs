// getuserevents (projectid, userprofileid)

import { ROLE_CLIENTADMIN, ROLE_CLIENTSPOC, ROLE_CLIENTCOORD, TABLE, ddbClient, GetItemCommand } from "./globals.mjs";
import { processAuthenticate } from './authenticate.mjs';
import { processAuthorize } from './authorize.mjs';
import { Buffer } from 'buffer';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getFormattedDate(date, prefomattedDate = false, hideYear = false) {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours();
  let minutes = date.getMinutes();

  if (minutes < 10) {
    // Adding leading zero to minutes
    minutes = `0${ minutes }`;
  }

  if (prefomattedDate) {
    // Today at 10:20
    // Yesterday at 10:20
    return `${ prefomattedDate } at ${ hours }:${ minutes }`;
  }

  if (hideYear) {
    // 10. January at 10:20
    return `${ day } ${ month } at ${ hours }:${ minutes }`;
  }

  // 10. January 2017. at 10:20
  return `${ day } ${ month } ${ year }. at ${ hours }:${ minutes }`;
}

function timeAgo(dateParam) {
  if (!dateParam) {
    return null;
  }

  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
  const DAY_IN_MS = 86400000; // 24 * 60 * 60 * 1000
  const today = new Date();
  const yesterday = new Date(today - DAY_IN_MS);
  const seconds = Math.round((today - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const isToday = today.toDateString() === date.toDateString();
  const isYesterday = yesterday.toDateString() === date.toDateString();
  const isThisYear = today.getFullYear() === date.getFullYear();


  if (seconds < 5) {
    return 'now';
  } else if (seconds < 60) {
    return `${ seconds } seconds ago`;
  } else if (seconds < 90) {
    return 'about a minute ago';
  } else if (minutes < 60) {
    return `${ minutes } minutes ago`;
  } else if (isToday) {
    return getFormattedDate(date, 'Today'); // Today at 10:20
  } else if (isYesterday) {
    return getFormattedDate(date, 'Yesterday'); // Yesterday at 10:20
  } else if (isThisYear) {
    return getFormattedDate(date, false, true); // 10. January at 10:20
  }

  return getFormattedDate(date); // 10. January 2017. at 10:20
}

export const processGetOnboardingStatus = async (event) => {
    
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
    const authoResult = await processAuthorize(event["headers"]["Authorization"], email);
    
    if(!authResult.admin.BOOL) {
        const authoRole = authoResult.result[0]["role"] != null ? JSON.parse(authoResult.result[0]["role"].S) : "";
        if(!authResult.result) {
            return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
        }
        if(!authResult.admin.BOOL && authoRole != ROLE_CLIENTADMIN && authoRole != ROLE_CLIENTSPOC && authoRole != ROLE_CLIENTCOORD) {
            return {statusCode: 401, body: {result: false, error: "Unauthorized request!"}};
        }    
    }
    
    // const userId = "1234";
    
    var projectid = null;
    
    try {
        projectid = JSON.parse(event.body).projectid.trim();
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
    
    var getParams = {
        TableName: TABLE,
        Key: {
          projectid: { S: projectid },
        },
    };
    
    async function ddbGet (getParams) {
        try {
          const data = await ddbClient.send(new GetItemCommand(getParams));
          return data;
        } catch (err) {
          return err;
        }
    };
    
    var resultGet = await ddbGet(getParams);
    
    const status = [];
    
    if(resultGet.Item != null) {
        
        if(resultGet.Item.timestampstatutesupdate == null) {
            status.push("Setup not done");
        } else {
          
          if(resultGet.Item.timestampstatutesupdate != null) {
            status.push("Statutes mapped;" + timeAgo(parseInt(resultGet.Item.timestampstatutesupdate.S)) + ";")
          }
          if(resultGet.Item.timestampcompliancesupdate != null) {
            status.push("Compliances mapped;" + timeAgo(parseInt(resultGet.Item.timestampcompliancesupdate.S)) + ";")
          }
          if(resultGet.Item.timestampcountriesupdate != null) {
            status.push("Countries mapped;" + timeAgo(parseInt(resultGet.Item.timestampcountriesupdate.S)) + ";")
          }
          if(resultGet.Item.timestampentitiesupdate != null) {
            status.push("Entities mapped;" + timeAgo(parseInt(resultGet.Item.timestampentitiesupdate.S)) + ";")
          }
          if(resultGet.Item.timestamplocationsupdate != null) {
            status.push("Locations mapped;" + timeAgo(parseInt(resultGet.Item.timestamplocationsupdate.S)) + ";")
          }
          if(resultGet.Item.timestampfunctionsupdate != null) {
            status.push("Functions mapped;" + timeAgo(parseInt(resultGet.Item.timestampfunctionsupdate.S)) + ";")
          }
          if(resultGet.Item.timestamptagsupdate != null) {
            status.push("Tags mapped;" + timeAgo(parseInt(resultGet.Item.timestamptagsupdate.S)) + ";")
          }
          if(resultGet.Item.timestampreportersupdate != null) {
            status.push("Reporters mapped;" + timeAgo(parseInt(resultGet.Item.timestampreportersupdate.S)) + ";")
          }
          if(resultGet.Item.timestampapproversupdate != null) {
            status.push("Approvers mapped;" + timeAgo(parseInt(resultGet.Item.timestampapproversupdate.S)) + ";")
          }
          if(resultGet.Item.timestampfunctionheadsupdate != null) {
            status.push("Functionheads mapped;" + timeAgo(parseInt(resultGet.Item.timestampfunctionheadsupdate.S)) + ";")
          }
          if(resultGet.Item.timestampauditorsupdate != null) {
            status.push("Auditors mapped;" + timeAgo(parseInt(resultGet.Item.timestampauditorsupdate.S)) + ";")
          }
          if(resultGet.Item.timestampviewersupdate != null) {
            status.push("Viewers mapped;" + timeAgo(parseInt(resultGet.Item.timestampviewersupdate.S)) + ";")
          }
          if(resultGet.Item.timestampdocsupdate != null) {
            status.push("Docs mapped;" + timeAgo(parseInt(resultGet.Item.timestampdocsupdate.S)) + ";")
          }
          if(resultGet.Item.timestampmakercheckersupdate != null) {
            status.push("Makercheckers mapped;" + timeAgo(parseInt(resultGet.Item.timestampmakercheckersupdate.S)) + ";")
          }
          if(resultGet.Item.timestampduedatesupdate != null) {
            status.push("Duedates mapped;" + timeAgo(parseInt(resultGet.Item.timestampduedatesupdate.S)) + ";")
          }
          if(resultGet.Item.timestampextensionsupdate != null) {
            status.push("Extensions mapped;" + timeAgo(parseInt(resultGet.Item.timestampextensionsupdate.S)) + ";")
          }
          if(resultGet.Item.timestampalertschedulesupdate != null) {
            status.push("Alertschedules mapped;" + timeAgo(parseInt(resultGet.Item.timestampalertschedulesupdate.S)) + ";")
          }
          if(resultGet.Item.timestampactivationsupdate != null) {
            status.push("Activations mapped;" + timeAgo(parseInt(resultGet.Item.timestampactivationsupdate.S)) + ";")
          }
          if(resultGet.Item.timestampinvalidationsupdate != null) {
            status.push("Invalidations mapped;" + timeAgo(parseInt(resultGet.Item.timestampinvalidationsupdate.S)) + ";")
          }
          if(resultGet.Item.timestamptriggersupdate != null) {
            status.push("Triggers mapped;" + timeAgo(parseInt(resultGet.Item.timestamptriggersupdate.S)) + ";")
          }
          if(resultGet.Item.timestampinternalcontrolsupdate != null) {
            status.push("Internalcontrols mapped;" + timeAgo(parseInt(resultGet.Item.timestampinternalcontrolsupdate.S)) + ";")
          }
          
        } 
        
    }
    
    const response = {statusCode: 200, body: {result: status}}
      // processAddLog(userId, 'detail', event, response, response.statusCode)
    return response;
    
}