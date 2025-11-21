// server/scripts/reset-listings.js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function safeDeleteMany(name, where = {}) {
  const m = prisma[name];
  if (!m || typeof m.deleteMany !== "function") return false;
  try {
    await m.deleteMany({ where });
    console.log(`• Cleared ${name}`);
    return true;
  } catch (e) {
    console.error(`× Failed clearing ${name}:`, e.code || e.message);
    throw e;
  }
}

async function main() {
  console.log("↻ Resetting listing-related tables…");

  // 1) Delete children FIRST (order matters)
  // Your schema clearly has ListingPhoto (based on FK error)
  await safeDeleteMany("listingPhoto");       // <— important

  // Optional children if present in your schema
  await safeDeleteMany("listingAmenity");
  await safeDeleteMany("visit");
  await safeDeleteMany("savedListing");
  await safeDeleteMany("promotion");

  // 2) Now delete parent
  await safeDeleteMany("listing");

  console.log("✅ Reset completed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    await prisma.$disconnect();
    process.exit(1);
  });
