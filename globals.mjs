const REGION = "us-east-1"; //e.g. "us-east-1"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";
import { ScanCommand, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { CloudWatchLogsClient, PutLogEventsCommand, GetLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, S3Client, GetObjectAttributesCommand, GetObjectCommand, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
const s3Client = new S3Client({});

const schedulerClient = new SchedulerClient({ region: REGION })

const kmsClient = new KMSClient({ region: REGION });

const ddbClient = new DynamoDBClient({ region: REGION });

const ENTITY_NAME = "event";

const KMS_KEY_REGISTER = {
    "41ab3c86-ccc0-4c0e-8e31-cd079a07a710": "6e78ee2c-9a00-43b9-ab08-0efb73423a6f",//ABC GLobals
    "f0f17ddb-546a-45f5-8a94-a5689fde8e64": "3e02606e-3ebb-4354-b301-57dd34c8f738",//Signode
    "c7d18a84-c2df-4dc2-b75f-5820549f5e5c": "4241bfb3-8a84-4e0b-b4ed-405b65c896b7",//Chitale
    "5c073644-5dce-4d8f-b82e-2bc2def2390f": "925b74fe-9b9a-4553-a66a-19812a97d7b6",//ABC Hospitals
    "5a05b884-d7ed-4f63-b623-4d305ea2cfd6": "9c988685-0c01-42cd-85e0-81ff06ee0e1a",//Standard Radiators
    "675fdd04-ca57-498b-a988-3de48af2a6bf": "146aa03f-2170-4228-a662-6b66bc724c6c",//Infotrends
    "411aa07b-6104-443b-8e9b-bb17e1ea5768": "8848bf02-2ac2-4876-8e2f-5c4bc8eff51a",//Inzpera
    "df1e1fd7-2a45-492d-b49d-60c4deb5073f": "df0710a5-abc1-484f-9085-208e1fb61a5a",//Butterfly
    "63d20443-b9cc-4a86-b39d-bf81c1c93ba5": "0b2a6560-3a32-41a5-b442-fbbf89650bc6",// PrecisionMed ABC
};

const TABLE = "T_sf-i-events_FlaggGRC-Events_1683434598476_test";
const TABLE_SIGNOFF = "T_sf-i-events_FlaggGRC-Events_Signoff_1683434598476_test";
const TABLE_S = "T_sf-i-events_FlaggGRC-Events_Statutes_1683434598476_test";
const TABLE_C = "T_sf-i-events_FlaggGRC-Events_Compliances_1683434598476_test";
const TABLE_CAL = "T_sf-i-events_FlaggGRC-Events_Calendar_1683434598476_test";
const TABLE_CAL_JOBS = "T_sf-i-events_FlaggGRC-Events_CalendarJobs_1683434598476_test";
const TABLE_R = "T_sf-i-events_FlaggGRC-Events_Reports_1683434598476_test";
const TABLE_T = "T_sf-i-events_FlaggGRC-Events_Triggers_1683434598476_test";
const TABLE_TAG = "T_sf-i-events_FlaggGRC-Events_Tags_1683434598476_test";
const TABLE_TAG_JOBS = "T_sf-i-events_FlaggGRC-Events_TagsJobs_1683434598476_test";
const TABLE_FHEAD = "T_sf-i-events_FlaggGRC-Events_FunctionHeads_1683434598476_test";
const TABLE_FHEAD_JOBS = "T_sf-i-events_FlaggGRC-Events_FunctionHeadsJobs_1683434598476_test";
const TABLE_AUD = "T_sf-i-events_FlaggGRC-Events_Auditors_1683434598476_test";
const TABLE_AUD_JOBS = "T_sf-i-events_FlaggGRC-Events_AuditorsJobs_1683434598476_test";
const TABLE_VIEW = "T_sf-i-events_FlaggGRC-Events_Viewers_1683434598476_test";
const TABLE_VIEW_JOBS = "T_sf-i-events_FlaggGRC-Events_ViewersJobs_1683434598476_test";
const TABLE_DOCS = "T_sf-i-events_FlaggGRC-Events_Docs_1683434598476_test";
const TABLE_DOCS_JOBS = "T_sf-i-events_FlaggGRC-Events_DocsJobs_1683434598476_test";
const TABLE_MAK = "T_sf-i-events_FlaggGRC-Events_MakerCheckers_1683434598476_test";
const TABLE_MAK_JOBS = "T_sf-i-events_FlaggGRC-Events_MakerCheckersJobs_1683434598476_test";
const TABLE_APPR = "T_sf-i-events_FlaggGRC-Events_Approvers_1683434598476_test";
const TABLE_APPR_JOBS = "T_sf-i-events_FlaggGRC-Events_ApproversJobs_1683434598476_test";
const TABLE_REP = "T_sf-i-events_FlaggGRC-Events_Reporters_1683434598476_test";
const TABLE_REP_JOBS = "T_sf-i-events_FlaggGRC-Events_ReportersJobs_1683434598476_test";
const TABLE_DUE = "T_sf-i-events_FlaggGRC-Events_Duedates_1683434598476_test";
const TABLE_DUE_JOBS = "T_sf-i-events_FlaggGRC-Events_DuedatesJobs_1683434598476_test";
const TABLE_LOC = "T_sf-i-events_FlaggGRC-Events_Locations_1683434598476_test";
const TABLE_LOC_JOBS = "T_sf-i-events_FlaggGRC-Events_LocationsJobs_1683434598476_test";
const TABLE_COU = "T_sf-i-events_FlaggGRC-Events_Countries_1683434598476_test";
const TABLE_COU_JOBS = "T_sf-i-events_FlaggGRC-Events_CountriesJobs_1683434598476_test";
const TABLE_FUNC = "T_sf-i-events_FlaggGRC-Events_Functions_1683434598476_test";
const TABLE_FUNC_JOBS = "T_sf-i-events_FlaggGRC-Events_FunctionJobs_1683434598476_test";
const TABLE_ENT = "T_sf-i-events_FlaggGRC-Events_Entities_1683434598476_test";
const TABLE_ENT_JOBS = "T_sf-i-events_FlaggGRC-Events_EntitiesJobs_1683434598476_test";
const TABLE_RCM_JOBS = "T_sf-i-events_FlaggGRC-Events_RcmJobs_1683434598476_test";
const TABLE_RCM_NOTIF = "T_sf-i-events_FlaggGRC-Events_RcmNotifications_1683434598476_test";
const TABLE_RCM_LOCKS = "T_sf-i-events_FlaggGRC-Events_RcmLocks_1683434598476_test";
const LOG_GROUP_NAME = "l-sf-i-events-1683434598476";

const BUCKET_NAME = "flagggrc-events-1683434598476-test";
const BUCKET_NAME_NOTICES = "flagggrc-notice-1732127400000-test";
const BUCKET_FOLDER_REPORTING = "reporting";
const BUCKET_FOLDER_STATISTICS = "statistics";

const AUTH_ENABLE = true;
const AUTH_REGION = "us-east-1";
const AUTH_API = "mj35xb6awri4lljb4dqwspsvam0khhgn";
const AUTH_STAGE = "test";
const USERPROFILE_API = "kew73ke7ggfstlawrfymxn62hi0jebct";
const NOTIFY_REGION = "us-east-1";
const NOTIFY_API = "56kb624qdsuad3hngeecpwby5y0ivpva";
const PROJECT_API = "tbzhakunxgz4tszxt4u2rte2sy0btyzg";
const PROJECT_DETAIL_PATH = "/detail";

const CHANGE_MANAGEMENT_API = "tqhxdgo5auwz65uep4hl33eufa0vbdka"
const CHANGE_MANAGEMENT_START_CALENDAR_PATH = "/startcalendarjob"


const SERVER_KEY = "asdf1234";

const ROLE_APPROVER = "approver";
const ROLE_REPORTER = "reporter";
const ROLE_FUNCTION_HEAD = "functionhead";
const ROLE_AUDITOR = "auditor";
const ROLE_VIEWER = "viewer";
const ROLE_ALL_ROLES = "allroles";
const ROLE_CLIENTSPOC = "dee55943-a74a-4349-a409-aa98e2acdd74";
const ROLE_CLIENTCOORD = "1d548fcf-0d1f-4ef9-9bc7-212fb8a9c934";
const ROLE_CLIENTADMIN = "ce6b805b-a869-4719-b438-ce67a5c5a38c";
const ROLES_ORDER = [ROLE_VIEWER, ROLE_APPROVER, ROLE_REPORTER, ROLE_FUNCTION_HEAD, ROLE_AUDITOR];

const UPLOAD_TYPE_REPORT = "report";
const UPLOAD_TYPE_REVIEW = "review";

const TIMEFRAME_BEFORE = "62f93cf5-5cc1-4756-9d73-2997f5ffc938";
const TIMEFRAME_AFTER = "b4e72138-1d6d-42ac-94c6-3a712f387323";

const VIEW_COUNTRY = "country";
const VIEW_ENTITY = "entity";
const VIEW_LOCATION = "location";
const VIEW_TAG = "tag";


const ADMIN_METHODS = ['create','update','delete'];

const FINCAL_START_MONTH = 4;

const NUM_ONBOARDING_BACKUPS = 4;

const CALENDAR_PROCESS_BLOCK_SIZE = 500;

const RANDOM_NUMBER_MAX_LIMIT = 20;

const REPORTING_RETRY_LIMIT = 5;

const EVENTS_LIST_CONCISE_THRESHOLD = 200;

export { 
    REGION,
    ScanCommand, 
    GetItemCommand, 
    PutItemCommand, 
    UpdateItemCommand,
    DeleteItemCommand,
    QueryCommand,
    ddbClient,
    TABLE, 
    TABLE_SIGNOFF,
    TABLE_C,
    TABLE_S,
    TABLE_CAL,
    TABLE_CAL_JOBS,
    TABLE_R,
    TABLE_T,
    TABLE_DUE,
    TABLE_DUE_JOBS,
    TABLE_APPR,
    TABLE_APPR_JOBS,
    TABLE_REP,
    TABLE_REP_JOBS,
    TABLE_TAG,
    TABLE_TAG_JOBS,
    TABLE_LOC,
    TABLE_LOC_JOBS,
    TABLE_COU,
    TABLE_COU_JOBS,
    TABLE_ENT,
    TABLE_ENT_JOBS,
    TABLE_FUNC,
    TABLE_FUNC_JOBS,
    TABLE_FHEAD,
    TABLE_FHEAD_JOBS,
    TABLE_AUD,
    TABLE_AUD_JOBS,
    TABLE_VIEW,
    TABLE_VIEW_JOBS,
    TABLE_DOCS,
    TABLE_DOCS_JOBS,
    TABLE_MAK,
    TABLE_MAK_JOBS,
    TABLE_RCM_JOBS,
    TABLE_RCM_NOTIF,
    TABLE_RCM_LOCKS,
    AUTH_ENABLE, 
    AUTH_REGION, 
    AUTH_API, 
    AUTH_STAGE,
    USERPROFILE_API,
    CloudWatchLogsClient,
    PutLogEventsCommand,
    LOG_GROUP_NAME,
    ADMIN_METHODS,
    GetLogEventsCommand,
    ROLE_APPROVER,
    ROLE_REPORTER,
    ROLE_FUNCTION_HEAD,
    ROLE_AUDITOR,
    ROLE_VIEWER,
    ROLE_ALL_ROLES,
    ROLE_CLIENTADMIN,
    ROLE_CLIENTSPOC,
    ROLE_CLIENTCOORD,
    ROLES_ORDER,
    UPLOAD_TYPE_REPORT,
    UPLOAD_TYPE_REVIEW,
    TIMEFRAME_BEFORE,
    TIMEFRAME_AFTER,
    FINCAL_START_MONTH,
    SERVER_KEY,
    PutObjectCommand, 
    S3Client, 
    GetObjectAttributesCommand, 
    GetObjectCommand, 
    CopyObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    s3Client,
    BUCKET_NAME,
    BUCKET_NAME_NOTICES,
    BUCKET_FOLDER_REPORTING,
    BUCKET_FOLDER_STATISTICS,
    NUM_ONBOARDING_BACKUPS,
    kmsClient,
    KMSClient,
    EncryptCommand,
    DecryptCommand,
    KMS_KEY_REGISTER,
    VIEW_COUNTRY,
    VIEW_ENTITY,
    VIEW_LOCATION,
    VIEW_TAG,
    ENTITY_NAME,
    NOTIFY_REGION,
    NOTIFY_API,
    PROJECT_API, PROJECT_DETAIL_PATH,
    getSignedUrl,
    schedulerClient,
    CreateScheduleCommand,
    CALENDAR_PROCESS_BLOCK_SIZE,
    RANDOM_NUMBER_MAX_LIMIT,
    REPORTING_RETRY_LIMIT,
    CHANGE_MANAGEMENT_API,
    CHANGE_MANAGEMENT_START_CALENDAR_PATH,
    EVENTS_LIST_CONCISE_THRESHOLD
};