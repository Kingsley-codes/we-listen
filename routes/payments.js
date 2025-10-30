const express = require("express");
const router = express.Router();
const authUser = require("../middleware/authUser");
const {
  initializePayment,
  callBack,
  verifyPayment,
} = require("../controllers/paymentController");

// User starts a payment
router.post("/initialize", authUser, initializePayment);

// Paystack redirects user here after checkout
router.get("/callback", callBack);

// Frontend (or callback) checks payment status
router.get("/verify/:reference", verifyPayment);

// // Paystack sends async notification here
// router.post("/webhook", paystackWebhook);

module.exports = router;

// Explanation: Routes map HTTP endpoints to controller functions. Therapist endpoints use x-therapist-token middleware.
