const authUser = require("./authUser");
const authTherapist = require("./authTherapist");

const authUserOrTherapist = (req, res, next) => {
  // Try user auth first
  authUser(req, res, (err) => {
    if (!err && req.user) {
      return next(); // user authenticated
    }

    // Otherwise, try therapist auth
    authTherapist(req, res, (err2) => {
      if (!err2 && req.therapist) {
        return next(); // therapist authenticated
      }

      // Neither worked
      return res.status(401).json({ message: "Unauthorized" });
    });
  });
};

module.exports = authUserOrTherapist;
