const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:obitopeeniola@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error("Push error:", err);
  }
}

module.exports = { sendPush };
