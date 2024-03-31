// import { initializeApp, applicationDefault, App } from 'firebase-admin/app';
// import { getMessaging } from "firebase-admin/messaging"
// import { config } from "dotenv";

import { Config } from "./config.service";

// config({ path: `.env.${process.env.NODE_ENV}`, debug: true });

// // const serviceAccount = require(Config.firebaseConfig.credentialFilePath);
// // const serviceAccount = require(Config.firebaseConfig.credentialFilePath);
// // import serviceAccount from "convo-square-firebase-adminsdk-aw1kn-71727dbd0d.json"
// console.log("GOOGLE_APPLICATION_CREDENTIALS: ", process.env.GOOGLE_APPLICATION_CREDENTIALS)
// // console.log({serviceAccount})
// const firebaseApp: App = initializeApp({
//     credential: applicationDefault(),
//     projectId: "convo-square",
//     serviceAccountId: "convo-square-service-account@convo-square-418912.iam.gserviceaccount.com",
// });

// const messagingApp = getMessaging(firebaseApp)

// async function sendNotification({ fcmToken, data }: { fcmToken: string, data?: any }) {
//     const firebaseMessagingResponse = await messagingApp.send({
//         data: data,
//         token: fcmToken
//     })

//     console.log({ firebaseMessagingResponse })
// }

// async function sendMultipleNotifications({ fcmTokens, data }: { fcmTokens: Array<string>, data?: any }) {
//     // const firebaseMessagingResponse = await messagingApp.sendEach({
//     //     data: data,
//     //     token: fcmToken
//     // })

//     // console.log({ firebaseMessagingResponse })
// }

var FCM = require("fcm-node");
var serverKey = Config.firebaseConfig.serverKey; //put your server key here
var fcm = new FCM(serverKey);

async function sendFcmNotif(fcmToken: string, data?: any) {
  console.log({ fcmToken, data });
  if (!fcmToken) {
    return;
  }
  var message = {
    //this may vary according to the message type (single recipient, multicast, topic, et cetera)
    to: fcmToken,
    notification: {
      title: "Convo Square",
      body: "New Message received",
    },

    data: data,
  };

  fcm.send(message, function (err: any, response: any) {
    if (err) {
      console.log("Something has gone wrong!");
    } else {
      console.log("Successfully sent with response: ", response);
    }
  });
}

const FirebaseService = {
  sendFcmNotif,
  // sendNotification,
  // sendMultipleNotifications
};

export { FirebaseService };
// import { initializeApp, applicationDefault } from "firebase-admin/app";
// import * as admin  from "firebase-admin";
// import { getMessaging } from "firebase-admin/messaging";
// // var serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

// // console.log({credential: admin.credential.})
// const app = initializeApp({
//   credential: applicationDefault(),
//   projectId: "convo-square",
// });
// getMessaging(app)
//   .send({
//     data: {
//         score: '850',
//         time: '2:45'
//       },
//       token: "cFDtC2hjqWScbvA3LylbeY:APA91bE89vQBVz74_HBp7wKLdQIpKiERq6uYrYyughOYPAX2HzyFjt2fOioJ9F_fWgnsxURBbwkh1yuGEMxKTKPn8FTKhvAO4ybZhOY0LLRjHh8MSpvmILvbQbuX8ReXPGZ_0UsCl-9M"
//   })
//   .then((response) => {
//     // res.status(200).json({
//     //   message: "Successfully sent message",
//     //   token: receivedToken,
//     // });
//     console.log("Successfully sent message:", response);
//   })
//   .catch((error) => {
//     // res.status(400);
//     // res.send(error);
//     console.log("Error sending message:", error);
//   });
