// src/scripts/seed.js
const connectDB = require("../config/db");
const Therapist = require("../models/Therapist");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

(async () => {
  await connectDB(process.env.MONGO_URI);
  const token = uuidv4().replace(/-/g, "");
  const therapist = await Therapist.create({
    therapistName: "Default Therapist",
    token,
    code: "Lis001",
  });
  console.log("Therapist token:", token);

  const username = "testuser";
  const password = "password123";
  if (!(await User.findOne({ username }))) {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash: hash });
    console.log("Test user created:", username, "password:", password);
  } else {
    console.log("Test user already exists:", username);
  }
  process.exit(0);
})();
