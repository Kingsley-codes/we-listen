const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  endpoint: String,
  keys: {
    p256dh: String,
    auth: String,
  },
});

const TherapistSchema = new mongoose.Schema({
  therapistName: { type: String, required: true, unique: true }, // username must be unique
  password: { type: String, required: true }, // password is just required, not unique
  code: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  subscriptions: [SubscriptionSchema], // store multiple subscriptions (different browsers/devices)
});

module.exports = mongoose.model("Therapist", TherapistSchema);
