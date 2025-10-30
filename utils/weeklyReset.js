// weeklyReset.js
const cron = require("node-cron");
const User = require("../models/User");

// Every Sunday at 12:00 AM
cron.schedule("0 0 * * 0", async () => {
  console.log("Resetting weekly free credits for all users");

  try {
    await User.updateMany({}, { free_credit_seconds: 150 * 60 });
    console.log("All users now have 150 free minutes");
  } catch (err) {
    console.error("Error resetting weekly credits:", err);
  }
});

// Run every minute (for testing)
// cron.schedule("* * * * *", async () => {
//   console.log("🔄 Test reset: resetting free credits");
//   await User.updateMany({}, { free_credit_seconds: 150 * 60 });
// });
