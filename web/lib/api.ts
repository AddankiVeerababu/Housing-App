// web/lib/api.ts
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

/* ---------------- Types ---------------- */
export type Role = "BUYER" | "RENTER" | "SELLER" | "AGENT";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: Role;
};

export type Listing = {
  id: string;
  title: string;
  price: number; // integer cents
  currency: string;
  city: string | null;
  state: string | null;
  category: "SALE" | "RENT";
  propertyType:
    | "APARTMENT"
    | "HOUSE"
    | "VILLA"
    | "CONDO"
    | "TOWNHOUSE"
    | "LAND"
    | "OTHER";
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft?: number | null;
  period?: "MO" | "WK" | null;
  availabilityDate?: string | null;
};

export type ListingDetail = Listing & {
  description: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  yearBuilt?: number | null;
  photos: { id: string; url: string; order: number; caption?: string | null }[];
  amenities: { amenity: { code: string; label: string } }[];
  createdBy?:
    | { id: string; name?: string | null; email: string; phone?: string | null; role: Role }
    | null;
};

/* ---------------- helpers ---------------- */
async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = (await res.text().catch(() => "")) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/* ---------------- session ---------------- */
export async function getMe() {
  const res = await fetch(`${API_BASE}/me`, {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) return { user: null as SessionUser | null };
  return j<{ user: SessionUser }>(res);
}

/* ---------------- listings (public) ---------------- */
export async function getListings(params: Record<string, string> = {}) {
  const url = new URL(`${API_BASE}/listings`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });
  const res = await fetch(url.toString(), {
    cache: "no-store",
    credentials: "include",
  });
  const data = await j<{ results: Listing[] }>(res);
  return data.results ?? [];
}

export async function getListing(id: string) {
  const res = await fetch(`${API_BASE}/listings/${id}`, {
    cache: "no-store",
    credentials: "include",
  });
  const data = await j<{ listing: ListingDetail }>(res);
  return data.listing;
}

/* ---------------- listings (owner) ---------------- */
export type CreateListingInput = {
  title: string;
  description: string;
  price: number; // cents
  currency?: string;
  category: "SALE" | "RENT";
  propertyType:
    | "APARTMENT"
    | "HOUSE"
    | "VILLA"
    | "CONDO"
    | "TOWNHOUSE"
    | "LAND"
    | "OTHER";
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  yearBuilt?: number;

  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  geo?: { lat?: number | string; lng?: number | string };

  period?: "MO" | "WK";
  availabilityDate?: string;

  photos?: (string | { url: string; caption?: string })[];
  amenities?: string[];
};

export async function createListing(input: CreateListingInput) {
  const body: any = {
    title: input.title,
    description: input.description,
    price: input.price,
    currency: input.currency ?? "USD",
    category: input.category,
    propertyType: input.propertyType,
    bedrooms: input.bedrooms ?? 0,
    bathrooms: input.bathrooms ?? 0,
    areaSqft: input.areaSqft ?? 0,
    yearBuilt: input.yearBuilt ?? null,

    addressLine1: input.address ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postalCode: input.postalCode ?? null,
    country: input.country ?? null,

    period: input.period ?? null,
    availabilityDate: input.availabilityDate ?? null,

    photos: input.photos ?? [],
    amenities: input.amenities ?? [],
  };

  // ✅ Safe lat/lng handling (never dereference geo without a guard)
  const lat = input.geo?.lat;
  if (lat !== undefined && lat !== null && lat !== "") {
    body.latitude = Number(lat);
  }
  const lng = input.geo?.lng;
  if (lng !== undefined && lng !== null && lng !== "") {
    body.longitude = Number(lng);
  }

  const res = await fetch(`${API_BASE}/listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await j<{ listing: ListingDetail }>(res);
  return data.listing;
}

export async function updateListing(
  id: string,
  patch: Partial<CreateListingInput>
) {
  const body: any = { ...patch };

  // Normalize geo -> latitude/longitude only if provided
  if (patch.geo) {
    const lat = patch.geo.lat;
    const lng = patch.geo.lng;
    if (lat !== undefined && lat !== null && lat !== "") {
      body.latitude = Number(lat);
    }
    if (lng !== undefined && lng !== null && lng !== "") {
      body.longitude = Number(lng);
    }
    delete body.geo;
  }

  // Normalize address field name
  if (patch.address !== undefined) {
    body.addressLine1 = patch.address;
    delete body.address;
  }

  const res = await fetch(`${API_BASE}/listings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await j<{ listing: ListingDetail }>(res);
  return data.listing;
}

export async function deleteListing(id: string) {
  const res = await fetch(`${API_BASE}/listings/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await j<{ ok: true }>(res);
  return true;
}

export async function getMyListings() {
  const res = await fetch(`${API_BASE}/me/listings`, {
    cache: "no-store",
    credentials: "include",
  });
  const data = await j<{ results: Listing[] }>(res);
  return data.results ?? [];
}

/* ---------------- uploads ---------------- */
export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const data = await j<{ url: string }>(res);
  return data.url;
}
