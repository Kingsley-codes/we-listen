const Ably = require("ably");
require("dotenv").config();

const ably = new Ably.Realtime(process.env.ABLY_API_KEY);

// Generate a token request for frontend authentication
const generateAblyToken = (clientId) => {
  return new Promise((resolve, reject) => {
    ably.auth.createTokenRequest({ clientId }, (err, tokenRequest) => {
      if (err) return reject(err);
      resolve(tokenRequest);
    });
  });
};

// Publish messages/events to a session channel
const publishToSession = (sessionId, event, payload) => {
  const channel = `session:${sessionId}`;
  return new Promise((resolve, reject) => {
    ably.channels.get(channel).publish(event, payload, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

// const publishToSession = (sessionId, event, payload) => {
//   const channel = `session:${sessionId}`;
//   console.log(`📡 Attempting publish → channel: ${channel}, event: ${event}, payload: ${JSON.stringify(payload)}`);

//   return new Promise((resolve, reject) => {
//     ably.channels.get(channel).publish(event, payload, (err) => {
//       if (err) {
//         console.error(`❌ Publish FAILED on ${channel} [${event}]`, err);
//         return reject(err);
//       }
//       console.log(`✅ Publish SUCCESS on ${channel} [${event}]`, payload);
//       resolve();
//     });
//   });
// };

// Publish updates to therapist's session list (for sidebar)
const publishToTherapistSessions = (therapistId, event, payload) => {
  const channel = `therapist:${therapistId}:sessions`;
  return new Promise((resolve, reject) => {
    ably.channels.get(channel).publish(event, payload, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

module.exports = {
  publishToSession,
  generateAblyToken,
  publishToTherapistSessions,
};

// Helper to publish events/messages to a session-specific Ably channel. Frontend subscribes to session:{sessionId}.
