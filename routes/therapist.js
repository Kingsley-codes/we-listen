const express = require("express");
const router = express.Router();
const therapistAuth = require("../middleware/authTherapist");
const {
  getUnassigned,
  getAssigned,
  replyToSession,
  getSessions,
  getNotifications
} = require("../controllers/therapistController");

router.get("/chats/unassigned", therapistAuth, getUnassigned);
router.get("/chats/assigned", therapistAuth, getAssigned);
router.post("/chat/reply", therapistAuth, replyToSession);
router.get("/chats", therapistAuth, getSessions);
router.post("/subscribe", therapistAuth, getNotifications);

module.exports = router;


