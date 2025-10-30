const User = require("../models/User");

/**
 * Atomically consume seconds from user's free_credit_seconds then paid_credit_seconds.
 * Returns { freeConsumed, paidConsumed, remaining }
 */
async function consumeUserCredits(userId, secondsToConsume) {
  // NOTE: This simple implementation loads the user doc, adjusts buckets, and saves.
  // For high concurrency consider using transactions or $inc with checks.
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  let remaining = secondsToConsume;
  let freeConsumed = 0;
  let paidConsumed = 0;

  if ((user.free_credit_seconds || 0) > 0) {
    const useFromFree = Math.min(user.free_credit_seconds, remaining);
    user.free_credit_seconds -= useFromFree;
    freeConsumed = useFromFree;
    remaining -= useFromFree;
  }

  if (remaining > 0 && (user.paid_credit_seconds || 0) > 0) {
    const useFromPaid = Math.min(user.paid_credit_seconds, remaining);
    user.paid_credit_seconds -= useFromPaid;
    paidConsumed = useFromPaid;
    remaining -= useFromPaid;
  }

  await user.save();
  return { freeConsumed, paidConsumed, remaining, user };
}

module.exports = { consumeUserCredits };


// Ably publishes events to frontends; creditUtils updates user buckets.