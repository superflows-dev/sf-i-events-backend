const REGION = "AWS_REGION"; //e.g. "us-east-1"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { CloudWatchLogsClient, PutLogEventsCommand, GetLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

const ddbClient = new DynamoDBClient({ region: REGION });

const TABLE = "DB_TABLE_NAME";
const LOG_GROUP_NAME = "AWS_LOG_GROUP_NAME";

const AUTH_ENABLE = true;
const AUTH_REGION = "AWS_AUTH_REGION";
const AUTH_API = "AWS_AUTH_API";
const AUTH_STAGE = "test";

const ADMIN_METHODS = BACKEND_ADMIN_METHODS;

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
    AUTH_ENABLE, 
    AUTH_REGION, 
    AUTH_API, 
    AUTH_STAGE,
    CloudWatchLogsClient,
    PutLogEventsCommand,
    LOG_GROUP_NAME,
    ADMIN_METHODS,
    GetLogEventsCommand,
};