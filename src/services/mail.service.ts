import {
  MailService as SendGridMailService,
  ClientResponse,
  MailDataRequired,
} from "@sendgrid/mail";
import { Config } from "./config.service";
const { from, apiKey } = Config.mailerConfig;

type MailData = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const mailService: SendGridMailService = new SendGridMailService();
mailService.setApiKey(apiKey);

async function sendEmail(params: MailData) {
  const data: MailDataRequired = {
    ...params,
    from: from, // Use the email address or domain you verified above
  };
  mailService.send({ ...data }).then(
    (response) => {
      const clientResponse: ClientResponse = response[0];
      console.log({ clientResponse });
      console.log("email sent");
      console.log(clientResponse.statusCode);
    },
    (error) => {
      console.log("error sending email");

      console.error(error);

      if (error.response) {
        console.error(error.response.body);
      }
    },
  );
}
const MailService = {
  sendEmail,
};
export { MailService };
