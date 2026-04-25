// ─────────────────────────────────────────────────────────────────────────────
// Factory Brain — Database Seed Script
// Populates MongoDB Atlas with realistic demo users and data.
//
// Usage:
//   node scripts/seed.js              — seed demo data
//   node scripts/seed.js --clear      — wipe DB first, then seed
//   node scripts/seed.js --wipe       — wipe DB only
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');

// ── Demo Users ────────────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    username:   'demo_manager',
    email:      'demo@factorybrain.io',
    password:   'Demo@1234',       // plain text — hashed by model pre-save hook
    role:       'manager',
    isVerified: true,
    company: {
      name:           'Acme Manufacturing Pvt. Ltd.',
      industry:       'Electronics',
      numMachines:    '11–50',
      productionType: 'Make-to-stock',
    },
  },
  {
    username:   'admin_user',
    email:      'admin@factorybrain.io',
    password:   'Admin@1234',
    role:       'admin',
    isVerified: true,
    company: {
      name:           'Factory Brain HQ',
      industry:       'Automotive',
      numMachines:    '51–200',
      productionType: 'Discrete manufacturing (batch)',
    },
  },
  {
    username:   'viewer_user',
    email:      'viewer@factorybrain.io',
    password:   'Viewer@1234',
    role:       'viewer',
    isVerified: true,
    company: {
      name:           'Sunrise Textiles Ltd.',
      industry:       'Textile & Apparel',
      numMachines:    '1–10',
      productionType: 'Make-to-order',
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const log  = (msg)  => console.log(`  \x1b[32m✓\x1b[0m  ${msg}`);
const warn = (msg)  => console.log(`  \x1b[33m⚠\x1b[0m  ${msg}`);
const err  = (msg)  => console.log(`  \x1b[31m✗\x1b[0m  ${msg}`);

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    err('MONGODB_URI not set in .env — aborting.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log(`Connected to MongoDB`);
  } catch (e) {
    err(`MongoDB connection failed: ${e.message}`);
    process.exit(1);
  }
}

async function wipeDB() {
  await User.deleteMany({});
  warn('All users deleted.');
}

async function seedUsers() {
  let created = 0;
  let skipped = 0;

  for (const userData of DEMO_USERS) {
    const exists = await User.findOne({ email: userData.email });
    if (exists) {
      warn(`Skipped (already exists): ${userData.email}`);
      skipped++;
      continue;
    }
    await User.create(userData); // password hashed by pre-save hook
    log(`Created: ${userData.username} <${userData.email}> [${userData.role}]`);
    created++;
  }

  return { created, skipped };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n🌱  Factory Brain — Seed Script\n');

  const args  = process.argv.slice(2);
  const clear = args.includes('--clear');
  const wipe  = args.includes('--wipe');

  await connectDB();

  if (clear || wipe) await wipeDB();
  if (wipe) {
    console.log('\n✅  Database wiped.\n');
    await mongoose.disconnect();
    return;
  }

  const { created, skipped } = await seedUsers();

  console.log(`\n✅  Seeding complete — ${created} created, ${skipped} skipped.\n`);
  console.log('  Demo credentials:');
  console.log('  ┌────────────────────────────────┬──────────────┬──────────────┐');
  console.log('  │ Email                          │ Password     │ Role         │');
  console.log('  ├────────────────────────────────┼──────────────┼──────────────┤');
  DEMO_USERS.forEach(u => {
    const e = u.email.padEnd(30);
    const p = u.password.padEnd(12);
    const r = u.role.padEnd(12);
    console.log(`  │ ${e} │ ${p} │ ${r} │`);
  });
  console.log('  └────────────────────────────────┴──────────────┴──────────────┘\n');

  await mongoose.disconnect();
})();
