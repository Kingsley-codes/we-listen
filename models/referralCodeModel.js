import mongoose from 'mongoose';

const ReferralCodeSchema = new mongoose.Schema({
    currentCode: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    usageCount: {
        type: Number,
        default: 0
    },
});

const ReferralCode = mongoose.model('ReferralCode', ReferralCodeSchema);

export default ReferralCode;
