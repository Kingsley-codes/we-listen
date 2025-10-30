// sender.js
const Ably = require("ably/promises");
require("dotenv").config();

const ably = new Ably.Realtime.Promise(process.env.ABLY_API_KEY);
const sessionId = "68c04535091accbafeac7805";
const channel = ably.channels.get(`messages:${sessionId}`);
const ackChannel = ably.channels.get(`acks:${sessionId}`);

async function sendMessage(text) {
  const messageId = Date.now().toString(); // simple unique ID
  const msg = { id: messageId, text, sender: "Therapist" };

  // publish the message
  await channel.publish("message", msg);
  console.log(`Sent message: ${text} (id: ${messageId})`);

  // listen for acknowledgment
  ackChannel.subscribe("ack", (ack) => {
    if (ack.data.messageId === messageId) {
      console.log(`✅ Message delivered to receiver at ${ack.data.receivedAt}`);
    }
  });
}

// Example usage
sendMessage("Hello Bob!");
