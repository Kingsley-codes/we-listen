require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const therapistRoutes = require("./routes/therapist");
const paymentsRoutes = require("./routes/payments");
const rawBodyForWebhook = require("./middleware/rawBodyForWebhook");
const { paystackWebhook } = require("./controllers/paymentController");
const ablyRoutes = require("./routes/ably");
const { startTimerWorker } = require("./worker/timerWorker");
require("./utils/weeklyReset"); // import the weekly reset script

const app = express();
const PORT = process.env.PORT || 5000;

// connect DB
connectDB(process.env.MONGO_URI);

app.use(cors());

// Normal JSON body parser (all non-webhook routes)
app.use(express.json());

// body parser for regular routes
// app.use((req, res, next) => {
//   if (["POST", "PUT", "PATCH"].includes(req.method)) {
//     express.json()(req, res, next);
//   } else {
//     next();
//   }
// });

// Webhook route must use raw body BEFORE express.json
// This is isolated only to webhook endpoint
app.use("/payments/webhook", rawBodyForWebhook, paystackWebhook);

// Other routes
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/therapist", therapistRoutes);
app.use("/payments", paymentsRoutes); // note: excludes /payments/webhook
app.use("/ably", ablyRoutes);

app.get("/", (req, res) => res.send("Therapy backend is running"));

// start worker after routes and DB
startTimerWorker();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
