import { processMapEvents } from './mapevents.mjs';
import { processTriggerEvent } from './triggerevent.mjs';
import { processTriggerMyEvent } from './triggermyevent.mjs';
import { processUnTriggerMyEvent } from './untriggermyevent.mjs';
import { processReprogramTrigger } from './reprogramtrigger.mjs';
import { processUnTriggerEvent } from './untriggerevent.mjs';
import { processSyncCalendar } from './synccalendar.mjs';
import { processGetJobData } from './getjobdata.mjs';
import { processGetStoredMapping } from './getstoredmapping.mjs';
import { processGetUnmappedEvents } from './getunmappedevents.mjs';
import { processGetMappedStatutes } from './getmappedstatutes.mjs';
import { processGetMappedSerializedOnboarding } from './getmappedserializedonboarding.mjs';
import { processCancelOnboardingJob } from './cancelonboardingjob.mjs';
import { processUpdateSignoff } from './updatesignoff.mjs';
import { processGetSignoff } from './getsignoff.mjs';
import { processGetReportingStatus } from './getreportingstatus.mjs';
import { processGetOnboardingStatus } from './getonboardingstatus.mjs';
import { processGetMappedOnboarding } from './getmappedonboarding.mjs';
import { processGetMappedCompliances } from './getmappedcompliances.mjs';
import { processGetMappedProjects } from './getmappedprojects.mjs';
import { processGetRcmCalendarEvents } from './getrcmcalendarevents.mjs';
import { processGetRcmNotifications } from './getrcmnotifications.mjs';
import { processGetRcmLockedCompliances } from './getrcmlockedcompliances.mjs';
import { processUpdateMappedStatutes } from './updatemappedstatutes.mjs';
import { processUpdateMappedOnboarding } from './updatemappedonboarding.mjs';
import { processUpdateMappedCompliances } from './updatemappedcompliances.mjs';
import { processUpdateRcmCompliance } from './updatercmcompliance.mjs';
import { processUpdateRcmCalendar } from './updatercmcalendar.mjs';
import { processUpdateRcmNotifications } from './updatercmnotifications.mjs';
import { processGetCalendarJobs } from './getcalendarjobs.mjs';
import { processGetAllMyEvents } from './getallmyevents.mjs';
import { processGetAllCountryEvents } from './getallcountryevents.mjs';
import { processGetAllCountryEvents1 } from './getallcountryevents.1.mjs';
import { processGetAllCountryEvents2 } from './getallcountryevents.2.mjs';
import { processGetAllCountryEvents3 } from './getallcountryevents.3.mjs';
import { processCompileAllCountryEvents } from './compileallcountryevents.mjs';
import { processGetAllFunctionEvents } from './getallfunctionevents.mjs'; // deprecated
import { processGetAllFunctionEvents1 } from './getallfunctionevents.1.mjs'; // deprecated
import { processGetNextUserEvents } from './getnextuserevents.mjs';
import { processGetUserEvents } from './getuserevents.mjs';
import { processDeleteEventMappings } from './deleteeventmappings.mjs';
import { processGetRcmJobs } from './getrcmjobs.mjs';
import { processGetRcmReadyJobs } from './getrcmreadyjobs.mjs';
import { processGetRcmCompletedJobs } from './getrcmcompletedjobs.mjs';
import { processCreateRcmJob } from './creatercmjob.mjs';
import { processUpdateRcmJob } from './updatercmjob.mjs';
import { processUpdateRcmLock } from './updatercmlock.mjs';
import { processGetCalendar } from './getcalendar.mjs';
import { processGetCalendarUser } from './getcalendaruser.mjs';
import { processGenerateUserMap } from './generateusermap.mjs';
import { processGetCalendarTrigger } from './getcalendartrigger.mjs';
import { processGetCalendarRegister } from './getcalendarregister.mjs';
import { processUpload } from './upload.mjs';
import { processUploadReport } from './uploadreport.mjs';
import { processUploadReport1 } from './uploadreport.1.mjs';
import { processUploadReport2 } from './uploadreport.2.mjs';
import { processUploadReportsBulk } from './uploadreportsbulk.mjs';
import { processUploadReportsBulk1 } from './uploadreportsbulk.1.mjs';
import { processUploadReportsBulk2 } from './uploadreportsbulk.2.mjs';
import { processUploadReview } from './uploadreview.mjs';
import { processUploadReview1 } from './uploadreview.1.mjs';
import { processUploadReview2 } from './uploadreview.2.mjs';
import { processUploadReviewsBulk } from './uploadreviewsbulk.mjs';
import { processUploadReviewsBulk1 } from './uploadreviewsbulk.1.mjs';
import { processUploadReviewsBulk2 } from './uploadreviewsbulk.2.mjs';
import { processUploadReportsReviewsBulk1 } from './uploadreportsreviewsbulk.1.mjs';
import { processUploadReportsReviewsBulk2 } from './uploadreportsreviewsbulk.2.mjs';
import { processDeleteReview } from './deletereview.mjs';
import { processUploadAudit } from './uploadaudit.mjs';
import { processUploadAudit1 } from './uploadaudit.1.mjs';
import { processUploadAuditsBulk } from './uploadauditsbulk.mjs';
import { processUploadAuditsBulk1 } from './uploadauditsbulk.1.mjs';
import { processUploadExtract } from './uploadextract.mjs';
import { processDdbPut } from './ddbput.mjs';
import { processDdbQuery } from './ddbquery.mjs';
import { processDdbQueryPaginated } from './ddbquerypaginated.mjs';
import { processAddLog } from './addlog.mjs';
import { ENTITY_NAME } from './globals.mjs';
import { processGetDecryptedJson } from './getdecryptedjson.mjs';
import { processScheduleGetCalendarJob } from './schedulegetcalendarjob.mjs'
import { processGetReports } from './getreports.mjs'
import { processUpdateReportDate } from './updatereportdate.mjs'
import { processGetAllEventDetails } from './getalleventdetails.mjs'
import { processGetAllEventDetails1 } from './getalleventdetails.1.mjs'
import { processMigrateReporting } from './migratereporting.mjs'
import { processGetAllMyQuestions } from './getallmyquestions.mjs'
import { processCopyReportingToMonthly } from './copyreportingtomonthly.mjs'
import { processGetBulkReportJobs } from './getbulkreportjobs.mjs'
import { processReconcileReporting } from './reconcilereporting.mjs'
import { processReconcileSingleReport } from './reconcilesinglereport.mjs'
import { processGenerateStatistics } from './generatestatistics.mjs'
import { processGetStatistics } from './getstatistics.mjs'
export const handler = async (event, context, callback) => {
    
    console.log('here 1');
    
    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin" : '*',
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "Authorization, Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Access-Control-Allow-Credentials, Content-Type, isBase64Encoded, x-requested-with",
        "Access-Control-Allow-Credentials" : true,
        'Content-Type': 'application/json',
        "isBase64Encoded": false
      },
    };
    
    console.log('here 2');
    
    // processAddLog("0000", 'uploadextractbefore', event, '', 200)
    
    if(event != null) {
      if(event["jobId"] != null) {
        const jsonDataPassthrough = JSON.parse(event["dataPassthrough"]);
        // processAddLog("0000", 'uploadextractinside', jsonDataPassthrough, '', 200)
        const jsonData = JSON.parse(jsonDataPassthrough["data"]);
        if(jsonData["path"] == "uploadextract") {
          processUploadExtract(event["jobId"], jsonData, jsonDataPassthrough["fileIndex"], jsonDataPassthrough["key"], event["arrWords"], event["arrWordsMeta"]);
        }
      }
    }
    
    console.log('here 3');
    
    if(event["httpMethod"] == "OPTIONS") {
      callback(null, response);
      return;
    }
    
    if(event["requestContext"] != null) {
      if(event["requestContext"]["http"] != null) {
        if(event["requestContext"]["http"]["method"] != null) {
          if(event["requestContext"]["http"]["method"] == "OPTIONS") {
            callback(null, response);
            return;
          }
        }
      }
    }
    
    var path = "";
    
    if(event["path"] != null) {
      path = event["path"];
    } else {
      path = event["rawPath"];
    }
    
    if(event["headers"] != null) {
      if(event["headers"]["authorization"] != null) {
        event["headers"]["Authorization"] = event["headers"]["authorization"]
      } else if(event["headers"]["Authorization"] != null) {
        event["headers"]["authorization"] = event["headers"]["Authorization"]
      }
    }
    console.log('here 4', path)
    switch(path) {
      
        case "/"+ENTITY_NAME+"/mapevents":
        case "/mapevents":
          const resultMapEvents = await processMapEvents(event);
          response.body = JSON.stringify(resultMapEvents.body);
          response.statusCode = resultMapEvents.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/triggerevent":
        case "/triggerevent":
          const resultTriggerEvent = await processTriggerEvent(event);
          response.body = JSON.stringify(resultTriggerEvent.body);
          response.statusCode = resultTriggerEvent.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/triggermyevent":
        case "/triggermyevent":
          const resultTriggerMyEvent = await processTriggerMyEvent(event);
          response.body = JSON.stringify(resultTriggerMyEvent.body);
          response.statusCode = resultTriggerMyEvent.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/untriggermyevent":
        case "/untriggermyevent":
          const resultUnTriggerMyEvent = await processUnTriggerMyEvent(event);
          response.body = JSON.stringify(resultUnTriggerMyEvent.body);
          response.statusCode = resultUnTriggerMyEvent.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/reprogramtrigger":
        case "/reprogramtrigger":
          const resultReprogramTrigger = await processReprogramTrigger(event);
          response.body = JSON.stringify(resultReprogramTrigger.body);
          response.statusCode = resultReprogramTrigger.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/untriggerevent":
        case "/untriggerevent":
          const resultUnTriggerEvent = await processUnTriggerEvent(event);
          response.body = JSON.stringify(resultUnTriggerEvent.body);
          response.statusCode = resultUnTriggerEvent.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getcalendar":
        case "/getcalendar":
          const resultGetCalendar = await processGetCalendar(event);
          response.body = JSON.stringify(resultGetCalendar.body);
          response.statusCode = resultGetCalendar.statusCode;
        break;
        case "/"+ENTITY_NAME+"/getcalendaruser":
        case "/getcalendaruser":
          const resultGetCalendarUser = await processGetCalendarUser(event);
          response.body = JSON.stringify(resultGetCalendarUser.body);
          response.statusCode = resultGetCalendarUser.statusCode;
        break;
        case "/"+ENTITY_NAME+"/generateusermap":
        case "/generateusermap":
          const resultGenerateUserMap = await processGenerateUserMap(event);
          response.body = JSON.stringify(resultGenerateUserMap.body);
          response.statusCode = resultGenerateUserMap.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getcalendartrigger":
        case "/getcalendartrigger":
          const resultGetCalendarTrigger = await processGetCalendarTrigger(event);
          response.body = JSON.stringify(resultGetCalendarTrigger.body);
          response.statusCode = resultGetCalendarTrigger.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getcalendarregister":
        case "/getcalendarregister":
          const resultGetCalendarRegister = await processGetCalendarRegister(event);
          response.body = JSON.stringify(resultGetCalendarRegister.body);
          response.statusCode = resultGetCalendarRegister.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/synccalendar":
        case "/synccalendar":
          const resultSyncCalendar = await processSyncCalendar(event);
          response.body = JSON.stringify(resultSyncCalendar.body);
          response.statusCode = resultSyncCalendar.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getstoredmapping":
        case "/getstoredmapping":
          const resultGetStoredMapping = await processGetStoredMapping(event);
          response.body = JSON.stringify(resultGetStoredMapping.body);
          response.statusCode = resultGetStoredMapping.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getjobdata":
        case "/getjobdata":
          const resultGetJobData = await processGetJobData(event);
          response.body = JSON.stringify(resultGetJobData.body);
          response.statusCode = resultGetJobData.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getreportingstatus":
        case "/getreportingstatus":
          const resultGetReportingStatus = await processGetReportingStatus(event);
          response.body = JSON.stringify(resultGetReportingStatus.body);
          response.statusCode = resultGetReportingStatus.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getonboardingstatus":
        case "/getonboardingstatus":
          const resultGetOnboardingStatus = await processGetOnboardingStatus(event);
          response.body = JSON.stringify(resultGetOnboardingStatus.body);
          response.statusCode = resultGetOnboardingStatus.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getmappedonboarding":
        case "/getmappedonboarding":
          const resultGetMappedOnboarding = await processGetMappedOnboarding(event);
          response.body = JSON.stringify(resultGetMappedOnboarding.body);
          response.statusCode = resultGetMappedOnboarding.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getcalendarjobs":
        case "/getcalendarjobs":
          const resultGetCalendarJobs = await processGetCalendarJobs(event);
          response.body = JSON.stringify(resultGetCalendarJobs.body);
          response.statusCode = resultGetCalendarJobs.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/cancelonboardingjob":
        case "/cancelonboardingjob":
          const resultCancelOnboardingJob = await processCancelOnboardingJob(event);
          response.body = JSON.stringify(resultCancelOnboardingJob.body);
          response.statusCode = resultCancelOnboardingJob.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getrcmjobs":
        case "/getrcmjobs":
          const resultGetRcmJobs = await processGetRcmJobs(event);
          response.body = JSON.stringify(resultGetRcmJobs.body);
          response.statusCode = resultGetRcmJobs.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getrcmreadyjobs":
        case "/getrcmreadyjobs":
          const resultGetRcmReadyJobs = await processGetRcmReadyJobs(event);
          response.body = JSON.stringify(resultGetRcmReadyJobs.body);
          response.statusCode = resultGetRcmReadyJobs.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getrcmcompletedjobs":
        case "/getrcmcompletedjobs":
          const resultGetRcmCompletedJobs = await processGetRcmCompletedJobs(event);
          response.body = JSON.stringify(resultGetRcmCompletedJobs.body);
          response.statusCode = resultGetRcmCompletedJobs.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/creatercmjob":
        case "/creatercmjob":
          const resultCreateRcmJob = await processCreateRcmJob(event);
          response.body = JSON.stringify(resultCreateRcmJob.body);
          response.statusCode = resultCreateRcmJob.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatercmjob":
        case "/updatercmjob":
          const resultUpdateRcmJob = await processUpdateRcmJob(event);
          response.body = JSON.stringify(resultUpdateRcmJob.body);
          response.statusCode = resultUpdateRcmJob.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatesignoff":
        case "/updatesignoff":
          const resultUpdateSignoff = await processUpdateSignoff(event);
          response.body = JSON.stringify(resultUpdateSignoff.body);
          response.statusCode = resultUpdateSignoff.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getsignoff":
        case "/getsignoff":
          const resultGetSignoff = await processGetSignoff(event);
          response.body = JSON.stringify(resultGetSignoff.body);
          response.statusCode = resultGetSignoff.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatercmlock":
        case "/updatercmlock":
          const resultUpdateRcmLock = await processUpdateRcmLock(event);
          response.body = JSON.stringify(resultUpdateRcmLock.body);
          response.statusCode = resultUpdateRcmLock.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatercmcompliance":
        case "/updatercmcompliance":
          const resultUpdateRcmCompliance = await processUpdateRcmCompliance(event);
          response.body = JSON.stringify(resultUpdateRcmCompliance.body);
          response.statusCode = resultUpdateRcmCompliance.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatercmcalendar":
        case "/updatercmcalendar":
          const resultUpdateRcmCalendar = await processUpdateRcmCalendar(event);
          response.body = JSON.stringify(resultUpdateRcmCalendar.body);
          response.statusCode = resultUpdateRcmCalendar.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatercmnotifications":
        case "/updatercmnotifications":
          const resultUpdateRcmNotifications = await processUpdateRcmNotifications(event);
          response.body = JSON.stringify(resultUpdateRcmNotifications.body);
          response.statusCode = resultUpdateRcmNotifications.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getallmyevents":
        case "/getallmyevents":
          const resultGetAllMyEvents = await processGetAllMyEvents(event);
          response.body = JSON.stringify(resultGetAllMyEvents.body);
          response.statusCode = resultGetAllMyEvents.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getallcountryevents":
        case "/getallcountryevents":
          console.log('before getallcountryevents');
          const resultGetAllCountryEvents = await processGetAllCountryEvents(event);
          response.body = JSON.stringify(resultGetAllCountryEvents.body);
          response.statusCode = resultGetAllCountryEvents.statusCode;
        break;
        case "/"+ENTITY_NAME+"/getallcountryevents1":
        case "/getallcountryevents1":
          console.log('before getallcountryevents1');
          const resultGetAllCountryEvents1 = await processGetAllCountryEvents1(event);
          response.body = JSON.stringify(resultGetAllCountryEvents1.body);
          response.statusCode = resultGetAllCountryEvents1.statusCode;
        break;
        case "/"+ENTITY_NAME+"/getallcountryevents2":
        case "/getallcountryevents2":
          console.log('before getallcountryevents2');
          const resultGetAllCountryEvents2 = await processGetAllCountryEvents2(event);
          response.body = JSON.stringify(resultGetAllCountryEvents2.body);
          response.statusCode = resultGetAllCountryEvents2.statusCode;
        break;
        case "/"+ENTITY_NAME+"/getallcountryevents3":
        case "/getallcountryevents3":
          console.log('before getallcountryevents3');
          const resultGetAllCountryEvents3 = await processGetAllCountryEvents3(event);
          response.body = JSON.stringify(resultGetAllCountryEvents3.body);
          response.statusCode = resultGetAllCountryEvents3.statusCode;
        break;
        case "/"+ENTITY_NAME+"/compileallcountryevents":
        case "/compileallcountryevents":
          console.log('before compileallcountryevents');
          const resultCompileAllCountryEvents = await processCompileAllCountryEvents(event);
          response.body = JSON.stringify(resultCompileAllCountryEvents.body);
          response.statusCode = resultCompileAllCountryEvents.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getnextuserevents":
        case "/getnextuserevents":
          console.log('before getallcountryevents');
          const resultGetNextUserEvents = await processGetNextUserEvents(event);
          response.body = JSON.stringify(resultGetNextUserEvents.body);
          response.statusCode = resultGetNextUserEvents.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getallfunctionevents":
        case "/getallfunctionevents":
          // deprecated
          const resultGetAllFunctionEvents = await processGetAllFunctionEvents(event);
          response.body = JSON.stringify(resultGetAllFunctionEvents.body);
          response.statusCode = resultGetAllFunctionEvents.statusCode;
        break;
        case "/"+ENTITY_NAME+"/getallfunctionevents1":
        case "/getallfunctionevents1":
          // deprecated
          const resultGetAllFunctionEvents1 = await processGetAllFunctionEvents1(event);
          response.body = JSON.stringify(resultGetAllFunctionEvents1.body);
          response.statusCode = resultGetAllFunctionEvents1.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getmappedstatutes":
        case "/getmappedstatutes":
          const resultGetMappedStatutes = await processGetMappedStatutes(event);
          response.body = JSON.stringify(resultGetMappedStatutes.body);
          response.statusCode = resultGetMappedStatutes.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getmappedcompliances":
        case "/getmappedcompliances":
          const resultGetMappedCompliances = await processGetMappedCompliances(event);
          response.body = JSON.stringify(resultGetMappedCompliances.body);
          response.statusCode = resultGetMappedCompliances.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getmappedprojects":
        case "/getmappedprojects":
          const resultGetMappedProjects = await processGetMappedProjects(event);
          response.body = JSON.stringify(resultGetMappedProjects.body);
          response.statusCode = resultGetMappedProjects.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getrcmcalendarevents":
        case "/getrcmcalendarevents":
          const resultGetRcmCalendarEvents = await processGetRcmCalendarEvents(event);
          response.body = JSON.stringify(resultGetRcmCalendarEvents.body);
          response.statusCode = resultGetRcmCalendarEvents.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getrcmnotifications":
        case "/getrcmnotifications":
          const resultGetRcmNotifications = await processGetRcmNotifications(event);
          response.body = JSON.stringify(resultGetRcmNotifications.body);
          response.statusCode = resultGetRcmNotifications.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getrcmlockedcompliances":
        case "/getrcmlockedcompliances":
          const resultGetRcmLockedCompliances = await processGetRcmLockedCompliances(event);
          response.body = JSON.stringify(resultGetRcmLockedCompliances.body);
          response.statusCode = resultGetRcmLockedCompliances.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getmappedserializedonboarding":
        case "/getmappedserializedonboarding":
          const resultGetMappedSerializedOnboarding = await processGetMappedSerializedOnboarding(event);
          response.body = JSON.stringify(resultGetMappedSerializedOnboarding.body);
          response.statusCode = resultGetMappedSerializedOnboarding.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatemappedstatutes":
        case "/updatemappedstatutes":
          const resultUpdateMappedStatutes = await processUpdateMappedStatutes(event);
          response.body = JSON.stringify(resultUpdateMappedStatutes.body);
          response.statusCode = resultUpdateMappedStatutes.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatemappedonboarding":
        case "/updatemappedonboarding":
          const resultUpdateMappedOnboarding = await processUpdateMappedOnboarding(event);
          response.body = JSON.stringify(resultUpdateMappedOnboarding.body);
          response.statusCode = resultUpdateMappedOnboarding.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/updatemappedcompliances":
        case "/updatemappedcompliances":
          const resultUpdateMappedCompliances = await processUpdateMappedCompliances(event);
          response.body = JSON.stringify(resultUpdateMappedCompliances.body);
          response.statusCode = resultUpdateMappedCompliances.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getunmappedevents":
        case "/getunmappedevents":
          const resultGetUnmappedEvents = await processGetUnmappedEvents(event);
          response.body = JSON.stringify(resultGetUnmappedEvents.body);
          response.statusCode = resultGetUnmappedEvents.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getuserevents":
        case "/getuserevents":
          const resultGetUserEvents = await processGetUserEvents(event);
          response.body = JSON.stringify(resultGetUserEvents.body);
          response.statusCode = resultGetUserEvents.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/ddbput":
        case "/ddbput":
          const resultDdbPut = await processDdbPut(event);
          response.body = JSON.stringify(resultDdbPut.body);
          response.statusCode = resultDdbPut.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/ddbquery":
        case "/ddbquery":
          const resultDdbQuery = await processDdbQuery(event);
          response.body = JSON.stringify(resultDdbQuery.body);
          response.statusCode = resultDdbQuery.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/ddbquerypaginated":
        case "/ddbquerypaginated":
          const resultDdbQueryPaginated = await processDdbQueryPaginated(event);
          response.body = JSON.stringify(resultDdbQueryPaginated.body);
          response.statusCode = resultDdbQueryPaginated.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/deleteeventmappings":
        case "/deleteeventmappings":
          const resultDeleteEventMappings = await processDeleteEventMappings(event);
          response.body = JSON.stringify(resultDeleteEventMappings.body);
          response.statusCode = resultDeleteEventMappings.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/upload":
        case "/upload":
          const resultUpload = await processUpload(event);
          response.body = JSON.stringify(resultUpload.body);
          response.statusCode = resultUpload.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/uploadreport":
        case "/uploadreport":
          const resultUploadReport = await processUploadReport(event);
          response.body = JSON.stringify(resultUploadReport.body);
          response.statusCode = resultUploadReport.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreport1":
        case "/uploadreport1":
          const resultUploadReport1 = await processUploadReport1(event);
          response.body = JSON.stringify(resultUploadReport1.body);
          response.statusCode = resultUploadReport1.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreport2":
        case "/uploadreport2":
          const resultUploadReport2 = await processUploadReport2(event);
          response.body = JSON.stringify(resultUploadReport2.body);
          response.statusCode = resultUploadReport2.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/uploadreportsbulk":
        case "/uploadreportsbulk":
          const resultUploadReportsBulk = await processUploadReportsBulk(event);
          response.body = JSON.stringify(resultUploadReportsBulk.body);
          response.statusCode = resultUploadReportsBulk.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreportsbulk1":
        case "/uploadreportsbulk1":
          const resultUploadReportsBulk1 = await processUploadReportsBulk1(event);
          response.body = JSON.stringify(resultUploadReportsBulk1.body);
          response.statusCode = resultUploadReportsBulk1.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreportsbulk2":
        case "/uploadreportsbulk2":
          const resultUploadReportsBulk2 = await processUploadReportsBulk2(event);
          response.body = JSON.stringify(resultUploadReportsBulk2.body);
          response.statusCode = resultUploadReportsBulk2.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/uploadreview":
        case "/uploadreview":
          const resultUploadReview = await processUploadReview(event);
          response.body = JSON.stringify(resultUploadReview.body);
          response.statusCode = resultUploadReview.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreview1":
        case "/uploadreview1":
          const resultUploadReview1 = await processUploadReview1(event);
          response.body = JSON.stringify(resultUploadReview1.body);
          response.statusCode = resultUploadReview1.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreview2":
        case "/uploadreview2":
          const resultUploadReview2 = await processUploadReview2(event);
          response.body = JSON.stringify(resultUploadReview2.body);
          response.statusCode = resultUploadReview2.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/uploadreviewsbulk":
        case "/uploadreviewsbulk":
          const resultUploadReviewsBulk = await processUploadReviewsBulk(event);
          console.log('response', resultUploadReviewsBulk)
          response.body = JSON.stringify(resultUploadReviewsBulk.body);
          response.statusCode = resultUploadReviewsBulk.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreviewsbulk1":
        case "/uploadreviewsbulk1":
          const resultUploadReviewsBulk1 = await processUploadReviewsBulk1(event);
          console.log('response', resultUploadReviewsBulk1)
          response.body = JSON.stringify(resultUploadReviewsBulk1.body);
          response.statusCode = resultUploadReviewsBulk1.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreviewsbulk2":
        case "/uploadreviewsbulk2":
          const resultUploadReviewsBulk2 = await processUploadReviewsBulk2(event);
          console.log('response', resultUploadReviewsBulk2)
          response.body = JSON.stringify(resultUploadReviewsBulk2.body);
          response.statusCode = resultUploadReviewsBulk2.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreportsreviewsbulk1":
        case "/uploadreportsreviewsbulk1":
          const resultUploadReportsReviewsBulk1 = await processUploadReportsReviewsBulk1(event);
          console.log('response', resultUploadReportsReviewsBulk1)
          response.body = JSON.stringify(resultUploadReportsReviewsBulk1.body);
          response.statusCode = resultUploadReportsReviewsBulk1.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadreportsreviewsbulk2":
        case "/uploadreportsreviewsbulk2":
          const resultUploadReportsReviewsBulk2 = await processUploadReportsReviewsBulk2(event);
          console.log('response', resultUploadReportsReviewsBulk2)
          response.body = JSON.stringify(resultUploadReportsReviewsBulk2.body);
          response.statusCode = resultUploadReportsReviewsBulk2.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/deletereview":
        case "/deletereview":
          const resultDeleteReview = await processDeleteReview(event);
          response.body = JSON.stringify(resultDeleteReview.body);
          response.statusCode = resultDeleteReview.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/uploadaudit":
        case "/uploadaudit":
          const resultUploadAudit = await processUploadAudit(event);
          response.body = JSON.stringify(resultUploadAudit.body);
          response.statusCode = resultUploadAudit.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadaudit1":
        case "/uploadaudit1":
          const resultUploadAudit1 = await processUploadAudit1(event);
          response.body = JSON.stringify(resultUploadAudit1.body);
          response.statusCode = resultUploadAudit1.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/uploadauditsbulk":
        case "/uploadauditsbulk":
          const resultUploadAuditsBulk = await processUploadAuditsBulk(event);
          response.body = JSON.stringify(resultUploadAuditsBulk.body);
          response.statusCode = resultUploadAuditsBulk.statusCode;
        break;
        case "/"+ENTITY_NAME+"/uploadauditsbulk1":
        case "/uploadauditsbulk1":
          const resultUploadAuditsBulk1 = await processUploadAuditsBulk1(event);
          response.body = JSON.stringify(resultUploadAuditsBulk1.body);
          response.statusCode = resultUploadAuditsBulk1.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/getdecryptedjson":
        case "/getdecryptedjson":
          const resultGetDecryptedJson = await processGetDecryptedJson(event);
          response.body = JSON.stringify(resultGetDecryptedJson.body);
          response.statusCode = resultGetDecryptedJson.statusCode;
        break;
        
        case "/"+ENTITY_NAME+"/schedulegetcalendarjob":
        case "/schedulegetcalendarjob":
          const responseScheduleGetCalendarJob = await processScheduleGetCalendarJob(event);
          response.body = JSON.stringify(responseScheduleGetCalendarJob.body)
          response.statusCode = responseScheduleGetCalendarJob.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/getreports":
        case "/getreports":
          const responseGetReports = await processGetReports(event);
          response.body = JSON.stringify(responseGetReports.body)
          response.statusCode = responseGetReports.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/updatereportdate":
        case "/updatereportdate":
          const responseUpdateReportDate = await processUpdateReportDate(event);
          response.body = JSON.stringify(responseUpdateReportDate.body)
          response.statusCode = responseUpdateReportDate.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/getalleventdetails":
        case "/getalleventdetails":
          const responseGetAllEventDetails = await processGetAllEventDetails(event);
          response.body = JSON.stringify(responseGetAllEventDetails.body)
          response.statusCode = responseGetAllEventDetails.statusCode
        break;
        case "/"+ENTITY_NAME+"/getalleventdetails1":
        case "/getalleventdetails1":
          const responseGetAllEventDetails1 = await processGetAllEventDetails1(event);
          response.body = JSON.stringify(responseGetAllEventDetails1.body)
          response.statusCode = responseGetAllEventDetails1.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/migratereporting":
        case "/migratereporting":
          const responseMigrateReporting = await processMigrateReporting(event);
          response.body = JSON.stringify(responseMigrateReporting.body)
          response.statusCode = responseMigrateReporting.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/getallmyquestions":
        case "/getallmyquestions":
          const responseGetAllMyQuestions = await processGetAllMyQuestions(event);
          response.body = JSON.stringify(responseGetAllMyQuestions.body)
          response.statusCode = responseGetAllMyQuestions.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/copyreportingtomonhtly":
        case "/copyreportingtomonhtly":
          const responseCopyReportingToMonthly = await processCopyReportingToMonthly(event);
          response.body = JSON.stringify(responseCopyReportingToMonthly.body)
          response.statusCode = responseCopyReportingToMonthly.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/getbulkreportjobs":
        case "/getbulkreportjobs":
          const responseGetBulkReportJobs = await processGetBulkReportJobs(event);
          response.body = JSON.stringify(responseGetBulkReportJobs.body)
          response.statusCode = responseGetBulkReportJobs.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/reconcilereporting":
        case "/reconcilereporting":
          const responseReconcileReporting = await processReconcileReporting(event);
          response.body = JSON.stringify(responseReconcileReporting.body)
          response.statusCode = responseReconcileReporting.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/reconcilesinglereport":
        case "/reconcilesinglereport":
          const responseReconcileSingleReport = await processReconcileSingleReport(event);
          response.body = JSON.stringify(responseReconcileSingleReport.body)
          response.statusCode = responseReconcileSingleReport.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/generatestatistics":
        case "/generatestatistics":
          const responseGenerateStatistics = await processGenerateStatistics(event);
          response.body = JSON.stringify(responseGenerateStatistics.body)
          response.statusCode = responseGenerateStatistics.statusCode
        break;
        
        case "/"+ENTITY_NAME+"/getstatistics":
        case "/getstatistics":
          const responseGetStatistics = await processGetStatistics(event);
          response.body = JSON.stringify(responseGetStatistics.body)
          response.statusCode = responseGetStatistics.statusCode
        break;
        
    }
    
    callback(null, response);
    
    return response;
};