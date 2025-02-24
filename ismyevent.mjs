import { ROLE_REPORTER, ROLE_VIEWER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR } from "./globals.mjs";

export const processIsMyEvent = (assSerial, eventId, entityid, locationid, userprofileid, role) => {
    
    const jsonData = assSerial[eventId + ";" + entityid + ';' + locationid];
    if(jsonData.id == eventId && jsonData.entityid == entityid && jsonData.locationid == locationid) {
        if(role == ROLE_REPORTER) {
            
            if(assSerial[eventId + ";" + entityid + ';' + locationid]['mapreporters'][userprofileid]) {
            
                const locationname = jsonData.locationname;
                const countryname = jsonData.countryname;
                const entityname = jsonData.entityname;
                const functionArr = [];
                for(var k = 0; k < jsonData.functions.length; k++) {
                    functionArr.push(jsonData.functions[k].split(';')[0]);
                }
                return {
                    myEvent: true,
                    locationname: locationname,
                    countryname: countryname,
                    entityname: entityname,
                    functionArr: functionArr
                };
                    
            }
                
        } 
        else if(role == ROLE_FUNCTION_HEAD) {
            if(assSerial[eventId + ";" + entityid + ';' + locationid]['mapfunctionheads'][userprofileid]) {
                const locationname = jsonData.locationname;
                const countryname = jsonData.countryname;
                const entityname = jsonData.entityname;
                const functionArr = [];
                for(k = 0; k < jsonData.functions.length; k++) {
                    functionArr.push(jsonData.functions[k].split(';')[0]);
                }
                return {
                    myEvent: true,
                    locationname: locationname,
                    countryname: countryname,
                    entityname: entityname,
                    functionArr: functionArr
                };
            } else {
                console.log('returning null');
            }
        } 
        else if(role == ROLE_AUDITOR) {
            
            if(assSerial[eventId + ";" + entityid + ';' + locationid]['mapauditors'][userprofileid]) {
        
                const locationname = jsonData.locationname;
                const countryname = jsonData.countryname;
                const entityname = jsonData.entityname;
                const functionArr = [];
                for(k = 0; k < jsonData.functions.length; k++) {
                    functionArr.push(jsonData.functions[k].split(';')[0]);
                }
                return {
                    myEvent: true,
                    locationname: locationname,
                    countryname: countryname,
                    entityname: entityname,
                    functionArr: functionArr
                };
            
            }
        } 
        else if(role == ROLE_VIEWER) {
            
            if(assSerial[eventId + ";" + entityid + ';' + locationid]['mapviewers'][userprofileid]) {
        
                const locationname = jsonData.locationname;
                const countryname = jsonData.countryname;
                const entityname = jsonData.entityname;
                const functionArr = [];
                for(k = 0; k < jsonData.functions.length; k++) {
                    functionArr.push(jsonData.functions[k].split(';')[0]);
                }
                return {
                    myEvent: true,
                    locationname: locationname,
                    countryname: countryname,
                    entityname: entityname,
                    functionArr: functionArr
                };
            
            }
        } 
        else {
            
            if(assSerial[eventId + ";" + entityid + ';' + locationid]['mapapprovers'][userprofileid]) {
            
                const locationname = jsonData.locationname;
                const countryname = jsonData.countryname;
                const entityname = jsonData.entityname;
                const functionArr = [];
                for(k = 0; k < jsonData.functions.length; k++) {
                    functionArr.push(jsonData.functions[k].split(';')[0]);
                }
                return {
                    myEvent: true,
                    locationname: locationname,
                    countryname: countryname,
                    entityname: entityname,
                    functionArr: functionArr
                };
            
            }
        }
        
        return 
        
    }
    
}