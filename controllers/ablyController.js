const { generateAblyToken } = require("../utils/ablyClient");

/**
 * Endpoint to generate an Ably token for the frontend
 * Works for both users and therapists
 */
const getAblyToken = async (req, res) => {
  try {
    // Example: if user is logged in
    if (req.user) {
      const ablyToken = await generateAblyToken(`user-${req.user._id}`);
      return res.json({ ablyToken });
    }

    // Example: if therapist token is passed (no login system for therapists)
    if (req.therapist) {
      const ablyToken = await generateAblyToken(`therapist-${req.therapist._id}`);
      return res.json({ ablyToken });
    }

    return res.status(400).json({ message: "No valid identity provided" });
  } catch (err) {
    console.error("getAblyToken error", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAblyToken };
