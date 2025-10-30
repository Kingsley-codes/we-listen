const express = require("express");
const router = express.Router();
const authUser = require('../middleware/authUser');
const therapistUser = require('../middleware/authTherapist');
const { getAblyToken } = require("../controllers/ablyController");

// Example: frontend calls this endpoint to fetch Ably token
router.get("/token/user", authUser, getAblyToken);
router.get("/token/therapist", therapistUser, getAblyToken);

module.exports = router;
