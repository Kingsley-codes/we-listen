const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Therapist = require("../models/Therapist");

const defaultReferral = "AKYQYVST";

const signup = async (req, res) => {
  try {
    const { username, password, referralCode } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "username and password required" });
    if (!/^[a-zA-Z0-9]{2,50}$/.test(username))
      return res.status(400).json({ message: "Invalid username" });

    if (await User.findOne({ username }))
      return res.status(400).json({ message: "Username taken" });

    if (referralCode && referralCode !== defaultReferral) {
      return res.status(400).json({ message: "Invalid referral code" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash: hash,
      referralCode,
      paid_credit_seconds: 31622400,
      unlimitedPlan: referralCode ? true : false,
    });

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
      },
    });
  } catch (err) {
    console.error("signup error", err);
    res.status(500).json({ message: "Server error" });
  }
};

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

    // 1. Validate input
    if (!therapistName || !password) {
      return res
        .status(400)
        .json({ message: "Therapist name and password required" });
    }

    // 2. Find therapist by name
    const therapist = await Therapist.findOne({ therapistName });
    if (!therapist) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, therapist.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 4. Sign JWT
    const jwtToken = jwt.sign(
      { id: therapist._id, role: "therapist" }, // role can help if you want role-based auth
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    // 5. Send back token + therapist info
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
      },
    });
  } catch (err) {
    console.error("login error", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signup, login, therapistSignup, therapistLogin };

// Signup creates a user with hashed password and gives JWT. Login returns JWT.
