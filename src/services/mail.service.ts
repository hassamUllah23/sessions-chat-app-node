// import { MailService as SendGrid } from '@sendgrid/mail'
// import {} from 'nodemailer'

import { Config } from "./config.service";
const nodemailer = require("nodemailer");
const { from, password, smtpHost, smtpPort, username } = Config.mailerConfig;
// const transporter = nodemailer.createTransport({
//     host: "smtp.ethereal.email",
//     port: 587,
//     secure: false, // Use `true` for port 465, `false` for all other ports
//     auth: {
//         user: "jairo.larson@ethereal.email",
//         pass: "a3UmcEy6TpYeZbB1Xd",
//     },
//     // host: `${smtpHost}`,
//     // port: `${smtpPort}`,
//     // secure: false, // Use `true` for port 465, `false` for all other ports
//     // auth: {
//     //     user: `${username}`,
//     //     pass: `${password}`,
//     // },
// });
// import { MailService as SendGridMailService, ClientResponse, ResponseError, MailDataRequired } from '@sendgrid/mail';
// import { Config } from './config.service';

// // sgMail.setApiKey(apiKey);
// const data: MailDataRequired = {
//     to: to,
//     from: from, // Use the email address or domain you verified above
//     subject: 'Sending with Twilio SendGrid is Fun',
//     text: 'and easy to do anywhere, even with Node.js',
//     html: '<strong>and easy to do anywhere, even with Node.js</strong>',
// };

// const mailService: SendGridMailService = new SendGridMailService();
// mailService.setApiKey(apiKey);

async function sendEmail() {
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: "jairo.larson@ethereal.email",
      pass: "a3UmcEy6TpYeZbB1Xd",
    },
    // host: `${smtpHost}`,
    // port: `${smtpPort}`,
    // secure: false, // Use `true` for port 465, `false` for all other ports
    // auth: {
    //     user: `${username}`,
    //     pass: `${password}`,
    // },
  });
  console.log("sendign email");
  const info = await transporter.sendMail({
    from: '"Maddison Foo Koch 👻" <jairo.larson@ethereal.email>', // sender address
    to: "malikhassamullah1@yahoo.com", // list of receivers
    subject: "Hello From ChatApp", // Subject line
    text: "Hello world", // plain text body
    html: "<b>Hello world</b>", // html body
  });

  console.log(`Message sent: ${info}`);
  // console.log("sending email")
  // console.log({data})

  // mailService
  //     .send({ ...data })
  //     .then((response) => {
  //         const clientResponse: ClientResponse = response[0]
  //         console.log({clientResponse})
  //         console.log("email sent")
  //         console.log(clientResponse.statusCode)
  //     }, error => {
  //         console.log("error sending emaik")

  //         console.error(error);

  //         if (error.response) {
  //             console.error(error.response.body)
  //         }
  //     });
  //     console.log(Config.mailerConfig)
  //     const sgMail = new SendGrid()
  //     sgMail.setApiKey(Config.mailerConfig.apiKey)
  //     const msg = {
  //         to: "richardhedley90@gmail.com", // Change to your recipient
  //         from: 'hassam.ullah@softteams.com', // Change to your verified sender
  //         subject: 'Sending with SendGrid is Fun',
  //         text: 'and easy to do anywhere, even with Node.js',
  //         html: '<strong>and easy to do anywhere, even with Node.js</strong>',
  //     }
  //     sgMail
  //         .send(msg)
  //         .then((response) => {
  //             console.log(response[0])
  //             console.log('Email sent')
  //         })
  //         .catch((error) => {
  //             console.error(error)
  //         })
}
const sendEmailJsMail = async ({
  to_name,
  new_password,
}: {
  to_name: string;
  new_password: string;
}): Promise<any> => {
  var data = {
    service_id: "service_oq27lkb",
    template_id: "template_14shqw3",
    accessToken: "LajJnr41ZIAeRuEUMqst8",
    user_id: "Vt_grtv0qlUlQvTov",
    template_params: {
      to_name: to_name,
      new_password: new_password,
    },
  };
  return fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
};
const MailService = {
  sendEmail,
  sendEmailJsMail,
};
export { MailService };
