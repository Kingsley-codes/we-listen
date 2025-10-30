const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authUser = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return next(new Error("No user token")); // pass error to wrapper
    }

    const token = auth.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id);
    if (!user) {
      return next(new Error("Invalid user token"));
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(new Error("User unauthorized"));
  }
};

module.exports = authUser;

// Protects user routes by verifying JWT and attaching the user record to req.user.
