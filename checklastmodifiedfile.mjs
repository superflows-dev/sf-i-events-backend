import { s3Client, GetObjectAttributesCommand, BUCKET_NAME } from './globals.mjs'
export const processCheckLastModifiedFile = async (filename, lastmodified, bucketname = "") => {
    if(lastmodified == ""){
        return true
    }
    let command = new GetObjectAttributesCommand({
        Bucket: bucketname != "" ? bucketname : BUCKET_NAME,
        Key: filename,
        ObjectAttributes: ["ETag"]
    })
    let responseS3;
    try{
        responseS3 = await s3Client.send(command);
        let returnflag = (responseS3.LastModified.toString() == lastmodified.toString()) 
        console.log('file meta response', responseS3.LastModified, filename, lastmodified, returnflag)
        return returnflag;
    }catch(e){
        console.log('check file error', e)
    }
    return false
}