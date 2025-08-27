/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendRoomUpdateNotification = functions.firestore
    .document("tournaments/{tournamentId}")
    .onUpdate((change, context) => {
      const newData = change.after.data();
      const previousData = change.before.data();
      if (newData.roomId !== previousData.roomId ||
        newData.pass !== previousData.pass) {
        const payload = {
          notification: {
            title: `Update for ${newData.name}`,
            body: "Room ID and pass have been released! Check Updates.",
          },
        };
        return admin.messaging().sendToTopic("tournaments", payload);
      }
      return null;
    });
