/* Run with:  node scripts/seed-from-lex.js
   Requires: server/.env DATABASE_URL set, and `pnpm prisma db push` done.
*/
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

async function ensureSeedSeller() {
  const email = "seed-seller@example.com";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      // passwordHash can be null for seed users
      passwordHash: null,
      role: "SELLER",
      provider: "PASSWORD",
      name: "Seed Seller",
    },
    select: { id: true, email: true },
  });
  return user;
}

async function main() {
  const seedPath = path.resolve(__dirname, "../../lex/seed/housing-seed.json");

  console.log("🔎 Looking for seed file at:", seedPath);
  if (!fs.existsSync(seedPath)) {
    console.error("❌ Seed file not found at:", seedPath);
    console.error("Please create it or verify folder structure:");
    console.error("Expected path → <project-root>/lex/seed/housing-seed.json");
    process.exit(1);
  }

  const raw = fs.readFileSync(seedPath, "utf8");
  let items;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.error("❌ Could not parse JSON:", e.message);
    process.exit(1);
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.log("ℹ️  No items to seed. File is empty or not an array.");
    return;
  }

  console.log(`📦 Loaded ${items.length} seed listings.`);

  const seller = await ensureSeedSeller();

  for (const item of items) {
    // Map Lex → Prisma Listing fields
    // In your DB you've chosen integer cents for money.
    const price = typeof item.priceCents === "number" ? item.priceCents : 0;
    const latitude = item.geo?.lat ?? null;
    const longitude = item.geo?.lng ?? null;

    // 1) Make sure amenities exist, collect their ids
    const amenityIds = [];
    if (Array.isArray(item.amenities)) {
      for (const code of item.amenities) {
        const upper = String(code).toUpperCase();
        const a = await prisma.amenity.upsert({
          where: { code: upper },
          update: {},
          create: { code: upper, label: upper.replaceAll("_", " ") },
          select: { id: true },
        });
        amenityIds.push(a.id);
      }
    }

    // 2) Create listing
    const created = await prisma.listing.create({
      data: {
        title: item.title ?? "Untitled",
        description: item.description ?? "",
        price,
        currency: (item.currency || "usd").toUpperCase(),
        category: (item.category || "SALE").toUpperCase(),
        propertyType: (item.propertyType || "HOUSE").toUpperCase(),
        bedrooms: item.beds ?? null,
        bathrooms: item.baths ?? null,
        areaSqft: item.sqft ?? null,

        addressLine1: item.address || null,
        city: item.city || null,
        state: item.state || null,
        postalCode: item.postalCode || null,
        country: item.country || "USA",

        latitude,
        longitude,
        isActive: true,

        // ✅ Use the relation field, not a scalar id arg
        createdBy: { connect: { id: seller.id } },

        photos: {
          create: (Array.isArray(item.photos) ? item.photos : []).map((url, i) => ({
            url,
            caption: null,
            order: i,
          })),
        },

        amenities: {
          create: amenityIds.map((amenityId) => ({ amenityId })),
        },
      },
      include: { photos: true },
    });

    console.log("🏠 Seeded:", created.title, "→", created.id);
  }

  console.log("✅ All listings successfully seeded!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
