// getunmappedevents (projectid)

import { NUM_ONBOARDING_BACKUPS, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, BUCKET_NAME, s3Client} from "./globals.mjs";

export const processStoreMapping = async (projectid, flow) => {
    
    var responseS3 = null;
    var responseS3Minus = null;
    
    for(var i = NUM_ONBOARDING_BACKUPS; i >= 1; i--) {
        
        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: projectid + '_'+flow+'_job_enc_'+i+'.json',    
        });
        
        try {
            responseS3 = await s3Client.send(getCommand);
        } catch (err) {
          responseS3 = err["name"];
          console.error(err); 
        }
        
        const getCommandMinus = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: projectid + '_'+flow+'_job_enc_'+(i-1)+'.json',    
        });
        
        try {
            responseS3Minus = await s3Client.send(getCommandMinus);
        } catch (err) {
          responseS3Minus = err["name"];
          console.error(err); 
        }
        
        if(responseS3 != "AccessDenied" && responseS3Minus != "AccessDenied") {
            
            const deleteCommand = new DeleteObjectCommand ({
              "Bucket": BUCKET_NAME,
              "Key": "/"+BUCKET_NAME+"/"+(projectid + '_'+flow+'_job_enc_'+(i)+'.json')
            });
            
            try {
                await s3Client.send(deleteCommand);
            } catch (err) {
                console.error(err);
            }

        }
        
        if(responseS3Minus != "AccessDenied") {
            
            const copyCommand = new CopyObjectCommand ({
              "Bucket": BUCKET_NAME,
              "CopySource": "/"+BUCKET_NAME+"/"+(projectid + '_'+flow+'_job_enc_'+(i-1)+'.json'),
              "Key": (projectid + '_'+flow+'_job_enc_'+(i)+'.json')
            });
            
            try {
                await s3Client.send(copyCommand);
            } catch (err) {
                console.error(err); 
            }
            
        }
           
    }
    
    const copyCommand = new CopyObjectCommand ({
      "Bucket": BUCKET_NAME,
      "CopySource": "/"+BUCKET_NAME+"/"+(projectid + '_'+flow+'_job_enc.json'),
      "Key": (projectid + '_'+flow+'_job_enc_'+(0)+'.json')
    });
    
    try {
        await s3Client.send(copyCommand);
    } catch (err) {
        console.error(err); 
    }
    
}