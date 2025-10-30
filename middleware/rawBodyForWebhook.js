const getRawBody = require("raw-body");

module.exports = (req, res, next) => {
  // Only apply raw body parsing for Paystack webhook routes
  if (req.originalUrl.includes("/payments/webhook")) {
    getRawBody(
      req,
      {
        length: req.headers["content-length"],
        encoding: req.charset || "utf-8",
      },
      (err, string) => {
        if (err) return next(err);

        req.rawBody = string;

        try {
          req.body = string ? JSON.parse(string) : {};
        } catch (e) {
          req.body = {}; // fallback if invalid JSON
        }

        next();
      }
    );
  } else {
    next();
  }
};

// Paystack sends signed webhook payload; to verify signature we need the raw request body. This middleware captures it and also populates req.body
