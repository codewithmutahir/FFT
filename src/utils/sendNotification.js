const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendRoomUpdateNotification = functions.firestore
  .document("tournaments/{tournamentId}")
  .onUpdate((change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    if (newData.roomId !== previousData.roomId || newData.pass !== previousData.pass) {
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