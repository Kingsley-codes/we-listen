const Session = require("../models/Session");
const { publishToSession } = require("../utils/ablyClient");
const { consumeUserCredits } = require("../utils/creditUtils");

const LOOP_INTERVAL_MS = parseInt(process.env.WORKER_LOOP_MS || "5000", 10);
const THERAPIST_DELAY_SEC = 30;
const USER_INACTIVE_SEC = 300;

async function applyElapsedConsumption(session, elapsedSec) {
  if (elapsedSec <= 0) return;
  session.remaining_seconds = Math.max(
    0,
    session.remaining_seconds - elapsedSec
  );

  try {
    await consumeUserCredits(session.userId, elapsedSec);
  } catch (err) {
    console.error("Error consuming user credits", err);
  }
}

async function iterateOnce() {
  const now = new Date();
  const activeSessions = await Session.find({ status: "active" });

  for (const session of activeSessions) {
    try {
      const lastActiveTS = session.lastActiveTimestamp
        ? new Date(session.lastActiveTimestamp)
        : null;

      // Therapist delay rule
      if (session.lastUserMessageAt) {
        const lastUserTS = new Date(session.lastUserMessageAt);
        const lastTherTS = session.lastTherapistMessageAt
          ? new Date(session.lastTherapistMessageAt)
          : null;
        const userNeedsReply = !lastTherTS || lastTherTS < lastUserTS;
        if (userNeedsReply) {
          const pauseTime = new Date(
            lastUserTS.getTime() + THERAPIST_DELAY_SEC * 1000
          );
          if (now >= pauseTime) {
            if (lastActiveTS && pauseTime > lastActiveTS) {
              const elapsedSec = Math.floor((pauseTime - lastActiveTS) / 1000);
              await applyElapsedConsumption(session, elapsedSec);
            }
            session.status = "paused";
            session.lastActiveTimestamp = null;
            await session.save();
            await publishToSession(session._id.toString(), "session:paused", {
              reason: "therapist_delay",
            });
            continue;
          }
        }
      }

      // // User inactivity rule
      if (session.lastTherapistMessageAt) {
        const lastTherTS = new Date(session.lastTherapistMessageAt);
        const lastUserTS = session.lastUserMessageAt
          ? new Date(session.lastUserMessageAt)
          : null;
        const userHasNotRepliedSinceTher =
          !lastUserTS || lastUserTS < lastTherTS;
        if (userHasNotRepliedSinceTher) {
          const pauseTime = new Date(
            lastTherTS.getTime() + USER_INACTIVE_SEC * 1000
          );
          if (now >= pauseTime) {
            if (lastActiveTS && pauseTime > lastActiveTS) {
              const elapsedSec = Math.floor((pauseTime - lastActiveTS) / 1000);
              await applyElapsedConsumption(session, elapsedSec);
            }
            session.status = "paused";
            session.lastActiveTimestamp = null;
            await session.save();
            await publishToSession(session._id.toString(), "session:paused", {
              reason: "user_inactive",
            });
            continue;
          }
        }
      }

      // Normal active countdown
      if (lastActiveTS) {
        const elapsedSec = Math.floor((now - lastActiveTS) / 1000);
        if (elapsedSec > 0) {
          await applyElapsedConsumption(session, elapsedSec);
          session.lastActiveTimestamp = now;
        }
      } else {
        session.lastActiveTimestamp = now;
      }

      // Lock if no time left
      if (session.remaining_seconds <= 0) {
        session.status = "locked";
        session.lastActiveTimestamp = null;
        await session.save();
        await publishToSession(session._id.toString(), "session:locked", {
          reason: "out_of_credits",
        });
        continue;
      }

      await session.save();
    } catch (err) {
      console.error("Error processing session", session._id, err);
    }
  }
}

function startTimerWorker() {
  if (
    process.env.WORKER_ENABLED !== "true" &&
    process.env.WORKER_ENABLED !== "1"
  ) {
    console.log("Timer worker disabled by environment variable WORKER_ENABLED");
    return;
  }
  console.log(`Starting timer worker (interval ${LOOP_INTERVAL_MS}ms)`);
  iterateOnce().catch((err) => console.error("timerWorker initial error", err));
  setInterval(() => {
    iterateOnce().catch((err) => console.error("timerWorker loop error", err));
  }, LOOP_INTERVAL_MS);
}

module.exports = { startTimerWorker };


// This worker periodically enforces the pause/resume logic and deducts credits. Worker publishes Ably events for frontend to update UI