import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { z } from "zod";
import jwt from "jsonwebtoken";

const app = express();
const prisma = new PrismaClient();

const PORT: number = Number(process.env.PORT ?? 4000);


/* ---------------- middleware ---------------- */
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

/* ---------------- health ---------------- */
app.get("/", (_req, res) => {
  res.send("🚀 Housing MVP backend is running!");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/* ---------------- helpers: JWT cookie auth ---------------- */
function signToken(payload: any) {
  const secret = process.env.JWT_SECRET || "dev-only-secret";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function setAuthCookie(res: express.Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res: express.Response) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}

function verifyAuth(req: express.Request) {
  try {
    const token = req.cookies?.auth_token;
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET || "dev-only-secret");
  } catch {
    return null;
  }
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const payload = verifyAuth(req);
  if (!payload) return res.status(401).json({ message: "Unauthorized" });
  // @ts-ignore
  req.user = payload;
  next();
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
  status: z
    .enum(["REQUESTED", "CONFIRMED", "CANCELED", "COMPLETED"])
    .optional(),
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

  photos: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().optional(),
      })
    )
    .optional(),

  amenities: z.array(z.string()).optional(),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.enum(["BUYER", "SELLER", "RENTER", "AGENT"]).optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/* ---------------- auth ---------------- */
app.post("/signup", async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);
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

    const token = signToken({ uid: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);

    res.status(201).json({ user });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ message: "Invalid input", issues: err.issues });
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
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
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ message: "Invalid input", issues: err.issues });
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/me", async (req, res) => {
  const payload = verifyAuth(req);
  if (!payload) return res.status(401).json({ user: null });

  const me = await prisma.user.findUnique({
    where: { id: (payload as any).uid },
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
app.post("/listings", requireAuth, async (req, res, next) => {
  try {
    const parsed = listingCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    }
    const data = parsed.data;

    await prisma.$queryRaw`SELECT 1`;

    const amenityConnects: any[] = [];
    if (data.amenities?.length) {
      for (const code of data.amenities) {
        const upper = code.toUpperCase();
        const a = await prisma.amenity.upsert({
          where: { code: upper },
          update: {},
          create: { code: upper, label: upper.replace("_", " ") },
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

        createdBy: {
          connectOrCreate: {
            where: { email: "placeholder-seller@example.com" },
            create: {
              email: "placeholder-seller@example.com",
              passwordHash: await bcrypt.hash("Temp1234!", 10),
              role: "SELLER",
              provider: "PASSWORD",
            },
          },
        },

        amenities: { create: amenityConnects },
        photos: {
          create: (data.photos || []).map((p, i) => ({
            url: p.url,
            caption: p.caption ?? null,
            order: i,
          })),
        },
      },
      include: {
        photos: true,
        amenities: { include: { amenity: true } },
      },
    });

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
});

app.get("/listings/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        photos: true,
        amenities: { include: { amenity: true } },
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

    const where: any = {
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

    const where: any = {
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

    let finalUserId = userId || (req as any).user?.uid || null;

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

    const where: any = {
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

/* ---------------- error handler ---------------- */
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

/* ---------------- start ---------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
