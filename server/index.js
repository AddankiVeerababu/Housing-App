// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");

const app = express();
const prisma = new PrismaClient();

// Stable default API port
const PORT = process.env.PORT || 4000;

/* ---------------- middleware ---------------- */
// 👇 allow images/assets to be embedded cross-origin (from :3000)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS for API requests
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve uploaded images (no auth).  Add a long-lived cache if you like.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    // optional: cache control
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  })
);

/* ---------------- health ---------------- */
app.get("/", (_req, res) => {
  res.send("🚀 Housing MVP backend is running!");
});
app.get("/health", (_req, res) => res.json({ ok: true }))

/* ---------------- helpers: JWT cookie auth ---------------- */
function signToken(payload) {
  const secret = process.env.JWT_SECRET || "dev-only-secret";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}
function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}
function verifyAuth(req) {
  try {
    const token = req.cookies?.auth_token;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-only-secret");
    return payload; // { uid, email, role }
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  const payload = verifyAuth(req);
  if (!payload) return res.status(401).json({ message: "Unauthorized" });
  req.user = payload;
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    const payload = verifyAuth(req);
    if (!payload) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(payload.role)) return res.status(403).json({ message: "Forbidden" });
    req.user = payload;
    next();
  };
}

/* ---------------- validation ---------------- */
const visitCreateSchema = z.object({
  userId: z.string().optional(),
  userEmail: z.string().email().optional(),
  listingId: z.string(),
  scheduledAt: z.string().min(1),
  notes: z.string().optional(),
});
const visitUpdateSchema = z.object({
  status: z.enum(["REQUESTED", "CONFIRMED", "CANCELED", "COMPLETED"]).optional(),
  scheduledAt: z.string().min(1).optional(),
  notes: z.string().optional(),
});
const listingCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  price: z.number().int().positive(),
  currency: z.string().default("USD"),
  category: z.enum(["SALE", "RENT"]),
  propertyType: z.enum([
    "APARTMENT",
    "HOUSE",
    "VILLA",
    "CONDO",
    "TOWNHOUSE",
    "LAND",
    "OTHER",
  ]),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  areaSqft: z.number().int().min(0).optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),

  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // can be ["https://…", "…"] or [{url,caption}]
  photos: z
    .array(
      z.union([
        z.string().url(),
        z.object({ url: z.string().url(), caption: z.string().optional() }),
      ])
    )
    .optional(),

  amenities: z.array(z.string()).optional(), // ["PARKING","POOL"]
});

/* ---------------- auth (cookie) ---------------- */
app.post("/signup", async (req, res) => {
  try {
    const data = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
        role: z.enum(["BUYER", "SELLER", "RENTER", "AGENT"]).optional(),
        phone: z.string().optional(),
      })
      .parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name || null,
        role: data.role || "BUYER",
        phone: data.phone || null,
        provider: "PASSWORD",
      },
      select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
    });

    // Do NOT auto-login after signup.
    res.status(201).json({ user, requiresLogin: true });
  } catch (err) {
    if (err?.issues) return res.status(400).json({ message: "Invalid input", issues: err.issues });
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const data = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, email: true, name: true, role: true, phone: true, passwordHash: true },
    });
    if (!user || !user.passwordHash) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({ uid: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);
    const { passwordHash, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    if (err?.issues) return res.status(400).json({ message: "Invalid input", issues: err.issues });
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});
app.get("/me", async (req, res) => {
  const payload = verifyAuth(req);
  if (!payload) return res.status(401).json({ user: null });

  const me = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
  });
  if (!me) return res.status(401).json({ user: null });
  res.json({ user: me });
});
app.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/* ---------------- listings ---------------- */

// Create listing (SELLER/AGENT only) and attach to creator
app.post("/listings", requireRole("SELLER", "AGENT"), async (req, res, next) => {
  try {
    const parsed = listingCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    }
    const data = parsed.data;

    // Normalize photos to {url, caption, order}
    const photosCreate = (data.photos || [])
      .map((p, i) => {
        const url = typeof p === "string" ? p : p?.url;
        const caption = typeof p === "string" ? null : p?.caption ?? null;
        return url ? { url, caption, order: i } : null;
      })
      .filter(Boolean);

    // Upsert amenities
    const amenityConnects = [];
    if (data.amenities?.length) {
      for (const code of data.amenities) {
        const upper = code.toUpperCase();
        const a = await prisma.amenity.upsert({
          where: { code: upper },
          update: {},
          create: { code: upper, label: upper.replaceAll("_", " ") },
          select: { id: true },
        });
        amenityConnects.push({ amenityId: a.id });
      }
    }

    const listing = await prisma.listing.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency ?? "USD",
        category: data.category,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        areaSqft: data.areaSqft ?? null,
        yearBuilt: data.yearBuilt ?? null,

        addressLine1: data.addressLine1 ?? null,
        addressLine2: data.addressLine2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        postalCode: data.postalCode ?? null,
        country: data.country ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,

        createdById: req.user.uid,

        amenities: { create: amenityConnects },
        photos: { create: photosCreate },
      },
      include: {
        photos: true,
        amenities: { include: { amenity: true } },
        createdBy: { select: { id: true, name: true, email: true, phone: true, role: true } },
      },
    });

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
});

// Public listing queries
app.get("/listings/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        photos: true,
        amenities: { include: { amenity: true } },
        createdBy: { select: { id: true, name: true, email: true, phone: true, role: true } },
      },
    });
    if (!listing) return res.status(404).json({ error: "not found" });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});
app.get("/listings", async (req, res, next) => {
  try {
    const {
      q,
      city,
      state,
      category,
      propertyType,
      minPrice,
      maxPrice,
      bedrooms,
      take,
      skip,
    } = req.query;

    const where = {
      ...(q ? { title: { contains: String(q), mode: "insensitive" } } : {}),
      ...(city ? { city: { contains: String(city), mode: "insensitive" } } : {}),
      ...(state ? { state: { contains: String(state), mode: "insensitive" } } : {}),
      ...(category ? { category: String(category).toUpperCase() } : {}),
      ...(propertyType ? { propertyType: String(propertyType).toUpperCase() } : {}),
      ...(bedrooms ? { bedrooms: { gte: Number(bedrooms) } } : {}),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice ? { gte: Number(minPrice) } : {}),
              ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
          }
        : {}),
      isActive: true,
    };

    const results = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: take ? Number(take) : 20,
      skip: skip ? Number(skip) : 0,
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        city: true,
        state: true,
        category: true,
        propertyType: true,
        bedrooms: true,
        bathrooms: true,
      },
    });

    res.json({ results });
  } catch (err) {
    console.error("GET /listings error:", err);
    next(err);
  }
});

// My listings (SELLER/AGENT)
app.get("/me/listings", requireRole("SELLER", "AGENT"), async (req, res, next) => {
  try {
    const items = await prisma.listing.findMany({
      where: { createdById: req.user.uid },
      orderBy: { updatedAt: "desc" },
      include: { photos: true },
    });
    res.json({ results: items });
  } catch (err) {
    next(err);
  }
});

// Update (owner-only) — supports replacing photos & amenities
app.patch("/listings/:id", requireRole("SELLER", "AGENT"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const owned = await prisma.listing.findUnique({ where: { id } });
    if (!owned || owned.createdById !== req.user.uid) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Build scalar patch first
    const {
      photos: incomingPhotos,
      amenities: incomingAmenities,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      latitude,
      longitude,
      ...scalars
    } = req.body || {};

    // Apply scalar fields
    let updated = await prisma.listing.update({
      where: { id },
      data: {
        ...scalars,
        ...(addressLine1 !== undefined ? { addressLine1 } : {}),
        ...(addressLine2 !== undefined ? { addressLine2 } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(postalCode !== undefined ? { postalCode } : {}),
        ...(country !== undefined ? { country } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
      },
      include: { photos: true },
    });

    // Replace photos if provided (simple strategy: clear + recreate)
    if (Array.isArray(incomingPhotos)) {
      await prisma.listingPhoto.deleteMany({ where: { listingId: id } });
      const photosCreate = incomingPhotos
        .map((p, i) => {
          const url = typeof p === "string" ? p : p?.url;
          const caption = typeof p === "string" ? null : p?.caption ?? null;
          return url ? { listingId: id, url, caption, order: i } : null;
        })
        .filter(Boolean);
      if (photosCreate.length) {
        await prisma.listingPhoto.createMany({ data: photosCreate });
      }
      updated = await prisma.listing.findUnique({
        where: { id },
        include: { photos: true },
      });
    }

    // Replace amenities if provided (clear links then re-create)
    if (Array.isArray(incomingAmenities)) {
      await prisma.listingAmenity.deleteMany({ where: { listingId: id } });
      if (incomingAmenities.length) {
        const links = [];
        for (const codeRaw of incomingAmenities) {
          const code = String(codeRaw).toUpperCase();
          const a = await prisma.amenity.upsert({
            where: { code },
            update: {},
            create: { code, label: code.replaceAll("_", " ") },
            select: { id: true },
          });
          links.push({ listingId: id, amenityId: a.id });
        }
        if (links.length) await prisma.listingAmenity.createMany({ data: links });
      }
    }

    res.json({ listing: updated });
  } catch (err) {
    next(err);
  }
});

// Delete (owner-only) — cascade manually: photos & amenity links first
app.delete("/listings/:id", requireRole("SELLER", "AGENT"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const owned = await prisma.listing.findUnique({ where: { id } });
    if (!owned || owned.createdById !== req.user.uid) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await prisma.listingPhoto.deleteMany({ where: { listingId: id } });
    await prisma.listingAmenity.deleteMany({ where: { listingId: id } });
    await prisma.listing.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ---------------- map points ---------------- */
app.get("/map/listings", async (req, res, next) => {
  try {
    const { swlat, swlng, nelat, nelng, category } = req.query;
    const boxFilter =
      swlat && swlng && nelat && nelng
        ? {
            latitude: { gte: Number(swlat), lte: Number(nelat) },
            longitude: { gte: Number(swlng), lte: Number(nelng) },
          }
        : {};

    const where = {
      ...boxFilter,
      ...(category ? { category: String(category).toUpperCase() } : {}),
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
    };

    const points = await prisma.listing.findMany({
      where,
      select: { id: true, latitude: true, longitude: true, price: true, currency: true },
      take: 300,
    });

    res.json({ points });
  } catch (err) {
    next(err);
  }
});

/* ---------------- visits ---------------- */
app.post("/visits", requireAuth, async (req, res, next) => {
  try {
    const parsed = visitCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    }
    const { userId, userEmail, listingId, scheduledAt, notes } = parsed.data;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: "listing not found" });

    let finalUserId = userId || req.user?.uid || null;
    if (!finalUserId) {
      if (!userEmail) return res.status(400).json({ error: "userId or userEmail required" });
      const existing = await prisma.user.findUnique({ where: { email: userEmail } });
      if (existing) {
        finalUserId = existing.id;
      } else {
        const guest = await prisma.user.create({
          data: {
            email: userEmail,
            passwordHash: await bcrypt.hash("Temp1234!", 10),
            role: "BUYER",
            provider: "PASSWORD",
          },
          select: { id: true },
        });
        finalUserId = guest.id;
      }
    }

    const visit = await prisma.visit.create({
      data: {
        userId: finalUserId,
        listingId,
        scheduledAt: new Date(scheduledAt),
        status: "REQUESTED",
        notes: notes || null,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        listing: { select: { id: true, title: true, city: true } },
      },
    });

    res.status(201).json({ visit });
  } catch (err) {
    next(err);
  }
});
app.get("/visits", async (req, res, next) => {
  try {
    const { userId, listingId, status, from, to, take, skip } = req.query;

    const where = {
      ...(userId ? { userId: String(userId) } : {}),
      ...(listingId ? { listingId: String(listingId) } : {}),
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(from || to
        ? {
            scheduledAt: {
              ...(from ? { gte: new Date(String(from)) } : {}),
              ...(to ? { lte: new Date(String(to)) } : {}),
            },
          }
        : {}),
    };

    const visits = await prisma.visit.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      take: take ? Number(take) : 50,
      skip: skip ? Number(skip) : 0,
      include: {
        user: { select: { id: true, email: true, name: true } },
        listing: { select: { id: true, title: true, city: true } },
      },
    });

    res.json({ visits });
  } catch (err) {
    next(err);
  }
});
app.patch("/visits/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = visitUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    }
    const data = parsed.data;

    const existing = await prisma.visit.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "visit not found" });

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        listing: { select: { id: true, title: true, city: true } },
      },
    });

    res.json({ visit: updated });
  } catch (err) {
    next(err);
  }
});

// ---------- uploads ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${base}${ext || ".jpg"}`);
  },
});
const upload = multer({ storage });

app.post("/upload", requireRole("SELLER", "AGENT"), upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file" });
  const publicBase = process.env.PUBLIC_BASE || `http://localhost:${PORT}`;
  const url = `${publicBase}/uploads/${req.file.filename}`;
  res.json({ url });
});

/* ---------------- error handler ---------------- */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

/* ---------------- start ---------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
