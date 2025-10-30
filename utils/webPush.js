const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:obitopeeniola@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPush(subscription, payload) {
  try {
    console.log("sendpush called");
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("Push sent successfully");
  } catch (err) {
    console.error("Push error:", err);
  }
}

module.exports = { sendPush };
