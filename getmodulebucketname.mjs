import { BUCKET_NAME, BUCKET_NAME_NOTICES } from './globals.mjs'
export const processGetModuleBucketname = (module) => {
    let bucketname = "";
    console.log('module', module)
    switch(module){
        case "events":
            bucketname = BUCKET_NAME;
            break;
        case "notices":
            bucketname = BUCKET_NAME_NOTICES;
            break;
        default:
            bucketname = BUCKET_NAME;
            break;
        
    }
    return bucketname;
}