require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri.trim(), { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB.');

  const email = process.env.ADMIN_EMAIL || 'admin@skillbridge.ai';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const name = process.env.ADMIN_NAME || 'Super Admin';

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists (${email}). Skipping creation.`);
  } else {
    const hashed = await bcrypt.hash(password, 12);
    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: 'admin',
      status: 'active',
    });
    console.log(`✓ Admin created: ${admin.name} (${admin.email})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
