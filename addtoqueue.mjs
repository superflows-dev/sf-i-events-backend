import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
const sqsClient = new SQSClient({ region: "us-east-1" });

export const processSfIEventsAddToQueue = async (event) => {
    
    let response;

    console.log('body', event);

    const params = {
        DelaySeconds: 10,
        MessageAttributes: {
          Author: {
            DataType: "String",
            StringValue: "Superflows",
          }
        },
        MessageBody: event,
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/181895849565/SfIEventsGenerateCalendar"

    };

    try {
        const data = await sqsClient.send(new SendMessageCommand(params));
        if (data) {
          console.log("Success, message sent. MessageID:", data.MessageId);
          const bodyMessage = 'Message Send to SQS- Here is MessageId: ' +data.MessageId;
          response = {
            statusCode: 200,
            body: JSON.stringify(bodyMessage),
          };
        }else{
          response = {
            statusCode: 500,
            body: JSON.stringify('Some error occured !!')
          };
        }
        return response;
    }
        catch (err) {
        console.log("Error", err);
    }
    
    return {statusCode: 200, body: {result: true}};
    
}