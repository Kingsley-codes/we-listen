const express = require('express');
const router = express.Router();
const { signup, login, therapistSignup, therapistLogin } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/therapist-signup', therapistSignup);
router.post('/therapist-login', therapistLogin);

module.exports = router;
