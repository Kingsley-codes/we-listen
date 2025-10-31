const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Therapist = require("../models/Therapist");
const ReferralCode = require("../models/referralCodeModel.js");

const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

const adminMail = "dareadedeji@gmail.com";

const signup = async (req, res) => {
  try {
    const { username, password, referralCode } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "username and password required" });

    if (!/^[a-zA-Z0-9]{2,50}$/.test(username))
      return res.status(400).json({ message: "Invalid username" });

    if (await User.findOne({ username }))
      return res.status(400).json({ message: "Username taken" });

    // ✅ Fetch default referral inside function
    const defaultReferral = await ReferralCode.findOne();
    if (!defaultReferral)
      return res.status(500).json({ message: "Referral system not initialized" });

    // Referral validation
    let paid_credit_seconds = 0;
    let free_credit_seconds = 150 * 60;
    let unlimitedPlan = false;

    if (referralCode) {
      if (referralCode !== defaultReferral.currentCode)
        return res.status(400).json({ message: "Invalid referral code" });

      if (defaultReferral.usageCount >= 5)
        return res
          .status(400)
          .json({ message: "Referral code has exceeded usage limit" });

      // Apply rewards
      paid_credit_seconds = 31_622_400;
      free_credit_seconds = 0;
      unlimitedPlan = true;

      // Update referral usage
      defaultReferral.usageCount += 1;
      await defaultReferral.save();
    }

    // Create user
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash: hash,
      referralCode,
      paid_credit_seconds,
      free_credit_seconds,
      unlimitedPlan,
    });

    // Rotate code when limit reached
    if (defaultReferral.usageCount >= 5) {
      defaultReferral.currentCode = generateReferralCode();
      defaultReferral.usageCount = 0;
      await defaultReferral.save();
    }

    // Sign token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        freecredits: user.free_credit_seconds,
        paidcredit: user.paid_credit_seconds,
        unlimitedPlan: user.unlimitedPlan,
      },
    });
  } catch (err) {
    console.error("signup error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// other functions unchanged
const therapistSignup = async (req, res) => {
  try {
    const { therapistName, password } = req.body;

    if (!therapistName || !password)
      return res.status(400).json({ message: "name and password required" });

    if (!/^[a-zA-Z0-9]{2,50}$/.test(therapistName))
      return res.status(400).json({ message: "Invalid name" });

    if (await Therapist.findOne({ therapistName }))
      return res.status(400).json({ message: "Name taken" });

    const hash = await bcrypt.hash(password, 10);
    const user = await Therapist.create({ therapistName, password: hash });

    res.json({
      message: "Therapist registered successfully",
      user: {
        id: user._id,
        therapistName: user.therapistName,
      },
    });
  } catch (err) {
    console.error("therapistSignup error", err);
    res.status(500).json({ message: "Server error" });
  }
};

const therapistLogin = async (req, res) => {
  try {
    const { therapistName, password } = req.body;
    if (!therapistName || !password)
      return res
        .status(400)
        .json({ message: "Therapist name and password required" });

    const therapist = await Therapist.findOne({ therapistName });
    if (!therapist)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, therapist.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const jwtToken = jwt.sign(
      { id: therapist._id, role: "therapist" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.json({
      token: jwtToken,
      therapist: {
        id: therapist._id,
        name: therapist.therapistName,
      },
    });
  } catch (err) {
    console.error("therapistLogin error", err);
    res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "username and password required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        freecredits: user.free_credit_seconds,
        paidcredit: user.paid_credit_seconds,
        unlimitedPlan: user.unlimitedPlan,
      },
    });
  } catch (err) {
    console.error("login error", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signup, login, therapistSignup, therapistLogin };
