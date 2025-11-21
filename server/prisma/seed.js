// server/prisma/seed.js
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  // 1) Ensure a placeholder seller exists
  const sellerEmail = "placeholder-seller@example.com";
  const seller = await prisma.user.upsert({
    where: { email: sellerEmail },
    update: {},
    create: {
      email: sellerEmail,
      passwordHash: await bcrypt.hash("Temp1234!", 10),
      role: "SELLER",
      provider: "PASSWORD",
      name: "Placeholder Seller",
    },
  });

  // 2) Ensure common amenities exist
  const amenityCodes = ["PARKING", "POOL", "GYM", "GARDEN"];
  const amenityMap = {};
  for (const code of amenityCodes) {
    const a = await prisma.amenity.upsert({
      where: { code },
      update: {},
      create: { code, label: code.charAt(0) + code.slice(1).toLowerCase() },
    });
    amenityMap[code] = a.id;
  }

  // 3) Create two listings with photos + amenities
  const listingsData = [
    {
      title: "Bright 2BR Condo near Downtown",
      description:
        "Sunny 2-bedroom condo with modern kitchen and balcony. Close to shops and transit.",
      price: 325000,
      currency: "USD",
      category: "SALE",
      propertyType: "CONDO",
      bedrooms: 2,
      bathrooms: 1,
      areaSqft: 860,
      yearBuilt: 2012,
      addressLine1: "123 Maple St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "USA",
      latitude: 30.266666,
      longitude: -97.733330,
      photos: [
        { url: "https://images.unsplash.com/photo-1505692794403-34d4982f88aa", caption: "Living room" },
        { url: "https://images.unsplash.com/photo-1523217582562-09d0def993a6", caption: "Kitchen" },
      ],
      amenities: ["PARKING", "GYM"],
    },
    {
      title: "Cozy Family House with Garden",
      description:
        "3-bedroom single-family house with a large backyard and quiet street parking.",
      price: 2200, // monthly rent
      currency: "USD",
      category: "RENT",
      propertyType: "HOUSE",
      bedrooms: 3,
      bathrooms: 2,
      areaSqft: 1450,
      yearBuilt: 2004,
      addressLine1: "456 Oak Ave",
      city: "San Jose",
      state: "CA",
      postalCode: "95112",
      country: "USA",
      latitude: 37.338207,
      longitude: -121.886330,
      photos: [
        { url: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c", caption: "Front view" },
        { url: "https://images.unsplash.com/photo-1560449204-e02f11c3d0e2", caption: "Backyard" },
      ],
      amenities: ["GARDEN", "PARKING", "POOL"],
    },
  ];

  for (const [i, data] of listingsData.entries()) {
    const created = await prisma.listing.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency,
        category: data.category,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        areaSqft: data.areaSqft,
        yearBuilt: data.yearBuilt,
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        createdById: seller.id,
        photos: {
          create: data.photos.map((p, idx) => ({
            url: p.url,
            caption: p.caption || null,
            order: idx,
          })),
        },
        amenities: {
          create: data.amenities.map((code) => ({
            amenityId: amenityMap[code],
          })),
        },
      },
    });
    console.log(`Seeded listing ${i + 1}:`, created.title);
  }
}

main()
  .then(async () => {
    console.log("✅ Seed complete");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed", e);
    await prisma.$disconnect();
    process.exit(1);
  });
