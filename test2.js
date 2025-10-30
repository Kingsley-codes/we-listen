// receiver.js
const Ably = require("ably/promises");
require("dotenv").config();

const ably = new Ably.Realtime.Promise(process.env.ABLY_API_KEY);
const sessionId = "68c04535091accbafeac7805";
const channel = ably.channels.get(`messages:${sessionId}`);
const ackChannel = ably.channels.get(`acks:${sessionId}`);

// subscribe to messages
channel.subscribe("message", async (msg) => {
  console.log(`📨 Received message: ${msg.data.text} (id: ${msg.data.id})`);

  // send acknowledgment back
  await ackChannel.publish("ack", {
    messageId: msg.data.id,
    receivedAt: new Date().toISOString(),
  });
});
