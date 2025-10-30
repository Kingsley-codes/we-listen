const express = require('express');
const router = express.Router();
const authUser = require('../middleware/authUser');
const authUserOrTherapist = require("../middleware/authUserOrTherapist");
const { startSession, getSession, sendMessage, getMessages, pauseSession } = require('../controllers/chatController');

router.post('/start', authUser, startSession);
router.get('/session', authUser, getSession);
router.post('/message', authUser, sendMessage);
router.get('/messages/:sessionId', authUserOrTherapist, getMessages, );
router.post('/pause/:sessionId', authUserOrTherapist, pauseSession);

module.exports = router;
