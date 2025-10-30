const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  free_credit_seconds: { type: Number, default: 150 * 60 },
  paid_credit_seconds: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);

// Stores user credentials and two separate credit buckets (free and paid) for clarity.
