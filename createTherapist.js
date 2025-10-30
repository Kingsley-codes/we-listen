// scripts/createTherapist.js
require('dotenv').config();
const mongoose = require('mongoose');
const Therapist = require('../src/models/Therapist');
const connectDB = require('../src/config/db');
const crypto = require('crypto');

(async () => {
  await connectDB(process.env.MONGO_URI);
  const token = crypto.randomBytes(24).toString('hex');
  const t = await Therapist.create({ name: 'Therapy Team', token, code: 'Lis001' });
  console.log('Therapist created', t.token);
  process.exit(0);
})();
