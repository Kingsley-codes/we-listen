const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  provider: { type: String, default: "paystack" },
  reference: { type: String },
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },
  credited_seconds: { type: Number, default: 0 },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", PaymentSchema);


// These models cover users, therapists, sessions, messages, payments. Session.remaining_seconds is authoritative for session countdown; User has two separate buckets.