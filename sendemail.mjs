import nodemailer from 'nodemailer';
export const processSendEmail = async (to, subject, body, bodyHTML, addBcc = false) => {
    let transporter = nodemailer.createTransport({
            host: "email-smtp.us-east-1.amazonaws.com", // Notes on this below
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
              user: process.env.SMTP_USERNAME, // eslint-disable-line no-undef
              pass: process.env.SMTP_PASSWORD, // eslint-disable-line no-undef
            },
    });
      
    const message = {
        from: '"FlaggGRC Reminders" <rcm@flagggrc.tech>', // sender address
        to: to , // list of receivers
        bcc: addBcc ? "ninad.t@flagggrc.tech, hrushi@flagggrc.tech, jomon.j@flagggrc.tech," : "" , // list of receivers
        subject: subject,
        text: body, // plain text body
        html: bodyHTML
    };
  
    // Send it out!
    await transporter.sendMail(message);
}