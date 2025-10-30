const Ably = require("ably/promises");
require("dotenv").config();

const ably = new Ably.Realtime.Promise(process.env.ABLY_API_KEY);

const sessionId = "68c04535091accbafeac7805"; // use a real sessionId
const channel = ably.channels.get(`session:${sessionId}`);

channel.subscribe("message", (msg) => {
  console.log("Got message:", msg.data);
});
console.log(`Subscribed to channel: session:${sessionId}`);