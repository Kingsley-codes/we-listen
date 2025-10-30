const Session = require("../models/Session");
const Message = require("../models/Message");
const { publishToSession } = require("../utils/ablyClient");
const Therapist = require("../models/Therapist");

/**
 * Get unassigned sessions (new incoming chats). Therapists see all user messages (unassigned).
 */
const getUnassigned = async (req, res) => {
  try {
    const sessions = await Session.find({ status: "unassigned" })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({
        path: "messages",
        match: { sender: "user" }, // only user messages
        options: { sort: { createdAt: -1 }, limit: 100 }, // latest user message
      })
      .populate({
        path: "userId",
        select: "username", // only fetch username
      });

    res.json({ sessions });
  } catch (err) {
    console.error("getUnassigned error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get sessions assigned to this therapist.
 */
const getAssigned = async (req, res) => {
  try {
    const therapist = req.therapist;
    const sessions = await Session.find({ therapistId: therapist._id })
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate({
        path: "messages",
        match: { sender: "user" }, // only user messages
        options: { sort: { createdAt: -1 }, limit: 100 }, // latest user message
      })
      .populate({
        path: "userId",
        select: "username", // only fetch username
      });

    res.json({ sessions });
  } catch (err) {
    console.error("getAssigned error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get both assigned and unassigned sessions together.
 */
const getSessions = async (req, res) => {
  try {
    const therapist = req.therapist;

    // Fetch unassigned sessions
    const unassigned = await Session.find({ status: "unassigned" })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({
        path: "messages",
        match: { sender: "user" },
        options: { sort: { createdAt: -1 }, limit: 100 },
      })
      .populate({
        path: "userId",
        select: "username", // only fetch username
      });

    // Fetch assigned sessions
    const assigned = await Session.find({ therapistId: therapist._id })
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate({
        path: "messages",
        match: { sender: "user" },
        options: { sort: { createdAt: -1 }, limit: 100 },
      })
      .populate({
        path: "userId",
        select: "username", // only fetch username
      });

    res.json({
      assigned,
      unassigned,
    });
  } catch (err) {
    console.error("getSessions error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Therapist replies. If therapist is first to reply, atomically claim session and set to active (start timer).
 * If session was paused and therapist replies, resume.
 */
const replyToSession = async (req, res) => {
  try {
    const therapist = req.therapist;
    const { sessionId, text } = req.body;
    if (!sessionId || !text)
      return res.status(400).json({ message: "sessionId and text required" });

    // Claim or verify ownership
    const session = await Session.findOneAndUpdate(
      {
        _id: sessionId,
        $or: [{ therapistId: null }, { therapistId: therapist._id }],
      },
      {
        $set: {
          therapistId: therapist._id,
          assignedAt: new Date(),
          status: "active",
          lastActiveTimestamp: new Date(),
        },
      },
      { new: true }
    );

    if (!session)
      return res
        .status(409)
        .json({ message: "Session already claimed by another therapist" });

    if (session.status === "locked" || session.remaining_seconds <= 0) {
      return res
        .status(403)
        .json({ message: "Session locked/expired — payment required" });
    }

    const msg = await Message.create({
      sessionId: session._id,
      sender: "therapist",
      text,
    });

    session.lastTherapistMessageAt = new Date();

    // If previously paused, set to active and notify
    if (session.status === "paused") {
      session.status = "active";
      session.lastActiveTimestamp = new Date();
      await publishToSession(session._id.toString(), "session:resumed", {
        resumedBy: "therapist",
      });
    }

    await session.save();

    await publishToSession(session._id.toString(), "message", {
      sender: "therapist",
      text,
      createdAt: msg.createdAt,
    });

    res.json({ message: "sent", msg, session });
  } catch (err) {
    console.error("replyToSession error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// New: Store therapist push subscription for notifications
const getNotifications = async (req, res) => {
  try {
    const { therapistId, subscription } = req.body;
    if (!therapistId || !subscription) {
      return res
        .status(400)
        .json({ message: "therapistId and subscription required" });
    }

    const therapist = await Therapist.findById(therapistId);
    if (!therapist)
      return res.status(404).json({ message: "Therapist not found" });

    // avoid duplicates
    const exists = therapist.subscriptions.some(
      (sub) => sub.endpoint === subscription.endpoint
    );
    if (!exists) {
      therapist.subscriptions.push(subscription);
      await therapist.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving subscription", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getUnassigned,
  getAssigned,
  replyToSession,
  getSessions,
  getNotifications,
};

// Therapists can fetch unassigned sessions (see all new users) and claim them by replying. Atomic findOneAndUpdate ensures one therapist claims a session.
