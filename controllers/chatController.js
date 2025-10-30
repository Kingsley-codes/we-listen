const Session = require("../models/Session");
const Message = require("../models/Message");
// const User = require("../models/User");
const { sendPush } = require("../utils/webPush");
const Therapist = require("../models/Therapist");
const {
  publishToSession,
  publishToTherapistSessions,
} = require("../utils/ablyClient");

/**
 * Create or return an existing unexpired session for a user.
 * The session.remaining_seconds is initially user.free + user.paid.
 */
const startSession = async (req, res) => {
  try {
    const user = req.user;

    // Step 1: check for ongoing (unassigned/active/paused)
    let session = await Session.findOne({
      userId: user._id,
      status: { $in: ["unassigned", "active", "paused"] },
    });
    if (session) return res.json({ sessionId: session._id, session });

    // Step 2: check for locked session that can be resumed (topped up)
    session = await Session.findOne({
      userId: user._id,
      status: "locked",
    });

    const initial =
      (user.free_credit_seconds || 0) + (user.paid_credit_seconds || 0);

    if (session && initial > 0) {
      // resume existing session
      session.remaining_seconds += initial;
      session.status = "paused"; // or "unassigned" depending on your flow
      await session.save();
      return res.json({ sessionId: session._id, session });
    }

    // Step 3: fallback – create new session if none found
    const status = initial > 0 ? "unassigned" : "locked";
    session = await Session.create({
      userId: user._id,
      remaining_seconds: initial,
      status,
      lastActiveTimestamp: null,
    });

    return res.json({ sessionId: session._id, session });
  } catch (err) {
    console.error("startSession error", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getSession = async (req, res) => {
  try {
    const user = req.user;
    const session = await Session.findOne({
      userId: user._id,
      status: { $in: ["unassigned", "active", "paused"] },
    });
    if (!session) return res.status(404).json({ message: "No active session" });
    res.json({ session });
  } catch (err) {
    console.error("getSession error", err);
    res.status(500).json({ message: "Server error" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    const user = req.user; // comes from auth middleware

    // Validate input
    if (!text || !sessionId) {
      return res
        .status(400)
        .json({ message: "sessionId and text are required" });
    }

    // Fetch session
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Verify session belongs to the user
    if (!session.userId.equals(user._id)) {
      return res.status(403).json({ message: "Forbidden: Not your session" });
    }

    // Prevent sending if session is locked/expired
    if (["locked", "expired"].includes(session.status)) {
      return res
        .status(403)
        .json({ message: "Session locked or expired. Please renew credits." });
    }

    //  Create message in DB
    const msg = await Message.create({
      sessionId: session._id,
      sender: "user",
      text,
    });

    // Update session metadata
    session.messages.push(msg._id);
    session.lastUserMessageAt = new Date();
    await session.save();

    // Prepare payload
    const payload = {
      sender: "user",
      text,
      createdAt: msg.createdAt,
    };

    // Publish to session channel (chat window)
    await publishToSession(session._id.toString(), "message", payload);

    // Publish to therapist session list (sidebar updates)
    if (session.therapistId) {
      await publishToTherapistSessions(
        session.therapistId.toString(),
        "session_updated",
        {
          sessionId: session._id.toString(),
          lastMessage: payload,
        }
      );
    }
    // Push notification to the assigned therapist
    const therapist = await Therapist.findById(session.therapistId);

    if (therapist && therapist.subscriptions?.length > 0) {
      for (const sub of therapist.subscriptions) {
        await sendPush(sub, {
          event: "new_message",
          title: "New Message from User",
          body: text,
          data: {
            sessionId: session._id.toString(),
            sender: "user",
            createdAt: msg.createdAt,
            url: 'https://we-listen.co/therapist/homePage?'
          },
        });
      }
    } else {
      // Broadcast to all therapists if unassigned
      const therapists = await Therapist.find({
        "subscriptions.0": { $exists: true },
      });

      for (const t of therapists) {
        for (const sub of t.subscriptions) {
          await sendPush(sub, {
            event: "new_unassigned_chat",
            title: "New Unassigned Chat",
            body: text,
            data: {
              sessionId: session._id.toString(),
              createdAt: msg.createdAt,
              url: 'https://we-listen.co/therapist/homePage?'
            },
          });
        }
      }
    }
    // Respond
    res.json({ success: true, message: "Message sent", data: msg });
  } catch (err) {
    console.error("sendMessage error", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await Message.find({ sessionId }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (err) {
    console.error("getMessages error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// End Point ot pause session
const pauseSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Find session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Only allow active sessions to be paused
    if (session.status !== "active") {
      return res.status(400).json({ message: "Session is not active" });
    }

    // Set paused
    session.status = "paused";
    session.lastActiveTimestamp = null;
    await session.save();

    // Notify frontend via Ably
    await publishToSession(session._id.toString(), "session:paused", {
      reason: "manual_pause",
    });

    res.json({ message: "Session paused successfully", session });
  } catch (err) {
    console.error("pauseSession error", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  startSession,
  getSession,
  sendMessage,
  getMessages,
  pauseSession,
};

// Explanation:
// startSession creates session using free+paid. sendMessage stores user message and updates lastUserMessageAt. Timer still not started until therapist first
