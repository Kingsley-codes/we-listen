// src/config/db.js
const mongoose = require("mongoose");

const connectDB = async (mongoUri) => {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
    // await Therapist.syncIndexes();
  } catch (err) {
    console.error("DB connection error", err);
    process.exit(1);
  }

};

// async function resetDatabase() {
//   // Option 1: delete documents
//   // await mongoose.connection.db.collection("sessions").deleteMany({});
//   // await mongoose.connection.db.collection("therapists").deleteMany({});

//   // Option 2: drop collections
//   // await mongoose.connection.db.dropCollection("sessions").catch(() => {});
//   // await mongoose.connection.db.dropCollection("therapists").catch(() => {});

//   // Option 3: drop whole DB
//   await mongoose.connection.dropDatabase();

//   console.log("Database reset complete");
// }

// resetDatabase()


module.exports = connectDB;
