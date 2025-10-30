const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Session = require("../models/Session");

/**
 * Initialize payment with Paystack
 */
const initializePayment = async (req, res) => {
  try {
    const user = req.user;
    const { amount, sessionId } = req.body;
    if (!amount) return res.status(400).json({ message: "amount required" });

    // Map packages -> seconds
    const mapping = { 2000: 7200, 4000: 14400, 6000: 21600, 10000: 36000 };
    const credited_seconds = mapping[amount] || 0;
    if (!credited_seconds)
      return res.status(400).json({ message: "Invalid package amount" });

    // Save pending payment
    const payment = await Payment.create({
      userId: user._id,
      amount,
      reference: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "pending",
      credited_seconds,
      sessionId: sessionId || null,
    });

    // Call Paystack init
    const resp = await axios.post(
      `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: user.email || `finance@enforcatech.com`,
        amount: amount * 100,
        // reference: payment.reference,
        callback_url: process.env.PAYSTACK_CALLBACK_URL,
        metadata: { userId: user._id.toString(), sessionId: sessionId || null },
      },
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    if (resp.data && resp.data.status) {
      return res.json({
        authorization_url: resp.data.data.authorization_url,
        reference: payment.reference,
      });
    } else {
      return res
        .status(500)
        .json({ message: "Paystack init failed", data: resp.data });
    }
  } catch (err) {
    console.error("initializePayment error", err.response?.data || err.message);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Verify payment by reference
 */
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference)
      return res.status(400).json({ message: "reference required" });

    let payment = await Payment.findOne({ reference });

    // Already success locally
    if (payment && payment.status === "success") {
      return res.json({ status: "success", payment });
    }

    // Verify with Paystack
    const resp = await axios.get(
      `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    const data = resp.data.data;
    if (resp.data.status && data.status === "success") {
      // Update DB
      if (payment) {
        payment.status = "success";
        await payment.save();
      } else {
        payment = await Payment.create({
          userId: data.metadata?.userId || null,
          amount: data.amount / 100,
          reference,
          status: "success",
          credited_seconds: 0,
          sessionId: data.metadata?.sessionId || null,
        });
      }

      // Credit balances
      if (payment.credited_seconds > 0) {
        if (payment.userId) {
          const user = await User.findById(payment.userId);
          if (user) {
            user.paid_credit_seconds =
              (user.paid_credit_seconds || 0) + payment.credited_seconds;
            await user.save();
          }
        }
        if (payment.sessionId) {
          const session = await Session.findById(payment.sessionId);
          if (session) {
            session.remaining_seconds =
              (session.remaining_seconds || 0) + payment.credited_seconds;
            await session.save();
          }
        }
      }

      return res.json({ status: "success", payment });
    }

    return res.status(400).json({ status: "failed", data: resp.data });
  } catch (err) {
    console.error("verifyPayment error", err.response?.data || err.message);
    res.status(500).json({ message: "server error" });
  }
};

/**
 * Paystack webhook
 */
const paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.warn("Invalid Paystack signature");
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;

      // find payment record
      let payment = await Payment.findOne({ reference });
      if (!payment) {
        payment = await Payment.create({
          userId: data.metadata?.userId || null,
          amount: data.amount / 100,
          reference,
          status: "success",
          credited_seconds: 0, // if you need mapping here, apply it
          sessionId: data.metadata?.sessionId || null,
        });
      } else {
        payment.status = "success";
        await payment.save();
      }

      // credit user/session (rewrite here, not a helper)
      const credited_seconds = payment.credited_seconds || 0;
      const userId = data.metadata?.userId || payment.userId;
      const sessionId = data.metadata?.sessionId || payment.sessionId;

      if (userId && credited_seconds > 0) {
        const user = await User.findById(userId);
        if (user) {
          user.paid_credit_seconds =
            (user.paid_credit_seconds || 0) + credited_seconds;
          await user.save();
        }
      }

      if (sessionId && credited_seconds > 0) {
        const session = await Session.findById(sessionId);
        if (session) {
          session.remaining_seconds =
            (session.remaining_seconds || 0) + credited_seconds;
          session.status =
            session.remaining_seconds > 0 ? "active" : session.status;
          if (!session.lastActiveTimestamp)
            session.lastActiveTimestamp = new Date();
          await session.save();
        }
      }

      return res.status(200).send("ok");
    }

    res.status(200).send("ignored");
  } catch (err) {
    console.error("paystackWebhook error", err);
    res.status(500).send("server error");
  }
};

/**
 * Callback handler (Paystack redirect)
 */
const callBack = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).send("No reference provided");

    // Reuse verifyPayment logic
    const verifyResp = await axios.get(
      `${process.env.BACKEND_BASE_URL}/payments/verify/${reference}`
    );

    if (verifyResp.data.status === "success") {
      return res.redirect(
        `${process.env.FRONTEND_BASE_URL}/payment-success?reference=${reference}`
      );
    } else {
      return res.redirect(
        `${process.env.FRONTEND_BASE_URL}/payment-failed?reference=${reference}`
      );
    }
  } catch (err) {
    console.error("callback error", err.message);
    return res.redirect(`${process.env.FRONTEND_BASE_URL}/payment-failed`);
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  callBack,
};
