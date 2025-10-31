const mongoose = require("mongoose");

const ReferralCodeSchema = new mongoose.Schema({
    currentCode: {
        type: String,
        required: true,
        unique: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

module.exports = mongoose.model("ReferralCode", ReferralCodeSchema);


