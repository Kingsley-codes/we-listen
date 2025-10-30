const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Therapist",
    default: null,
  },
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
  assignedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ["unassigned", "active", "paused", "expired", "locked"],
    default: "unassigned",
  },
  remaining_seconds: { type: Number, required: true },
  is_paid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastUserMessageAt: { type: Date, default: null },
  lastTherapistMessageAt: { type: Date, default: null },
  lastActiveTimestamp: { type: Date, default: null },
});

module.exports = mongoose.model("Session", SessionSchema);

// A session owns the remaining_seconds and the assignment. We track timestamps to compute elapsed time when pausing/resuming and avoid per-second DB writes.
