const jwt = require("jsonwebtoken");
const Therapist = require("../models/Therapist");

const authTherapist = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No therapist token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure role is therapist
    if (payload.role !== "therapist") {
      return res.status(403).json({ message: "Forbidden: not a therapist" });
    }

    // Find therapist by ID
    const therapist = await Therapist.findById(payload.id);
    if (!therapist) {
      return res.status(401).json({ message: "Invalid therapist token" });
    }

    // Attach therapist to request
    req.therapist = therapist;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Therapist unauthorized" });
  }
};

module.exports = authTherapist;

// Therapists don't log in. They present a token header or query param; we resolve it to therapist metadata.
