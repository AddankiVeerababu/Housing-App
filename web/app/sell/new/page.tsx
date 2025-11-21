// web/app/sell/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createListing, getMe, type SessionUser } from "@/lib/api";
import RoleGate from "@/components/RoleGate";
import PhotoUploader from "@/components/PhotoUploader";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY"];

export default function NewListingPage() {
  const r = useRouter();

  // basic fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"SALE" | "RENT">("RENT");
  const [propertyType, setPropertyType] = useState<
    "APARTMENT" | "HOUSE" | "VILLA" | "CONDO" | "TOWNHOUSE" | "LAND" | "OTHER"
  >("APARTMENT");

  // --- State ---
  const [price, setPrice] = useState<string>(""); // accepts any format user types
  const [currency, setCurrency] = useState("USD");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [areaSqft, setAreaSqft] = useState<string>("");
  const [yearBuilt, setYearBuilt] = useState<number | "">("");

  // location
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  // rent-only
  const [period, setPeriod] = useState<"MO" | "WK" | "">("");
  const [availabilityDate, setAvailabilityDate] = useState("");

  // photos & amenities
  const [photoUrls, setPhotoUrls] = useState(""); // one URL per line
  const [amenities, setAmenities] = useState(""); // comma/space separated

  // agent info (readonly from /me)
  const [me, setMe] = useState<SessionUser | null>(null);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { user } = await getMe();
      setMe(user);
    })();
  }, []);

  function addPhoto(url: string) {
    setPhotoUrls((prev) => (prev ? `${prev}\n${url}` : url));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const photos =
        photoUrls
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((url) => ({ url })) ?? [];

      const amenityCodes =
        amenities
          .split(/[,\n]/g)
          .map((s) => s.trim().toUpperCase().replace(/\s+/g, "_"))
          .filter(Boolean) ?? [];

      const listing = await createListing({
        title,
        description,
        category,
        propertyType,
        price: price === "" ? 0 : Math.round(Number(price) * 100), // convert normal input → cents

        currency,
        bedrooms: bedrooms === "" ? undefined : Number(bedrooms),
        bathrooms: bathrooms === "" ? undefined : Number(bathrooms),
        areaSqft: areaSqft === "" ? undefined : Number(areaSqft),
        yearBuilt: yearBuilt === "" ? undefined : Number(yearBuilt),

        address,
        city,
        state,
        postalCode,
        country,

        geo: {
          lat: lat === "" ? undefined : Number(lat),
          lng: lng === "" ? undefined : Number(lng),
        },

        period: period === "" ? undefined : period,
        availabilityDate: availabilityDate || undefined,

        photos,
        amenities: amenityCodes,
      });

      r.replace(`/property/${listing.id}`);
    } catch (err: any) {
      alert(err?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleGate allow={["SELLER", "AGENT"]}>
      <main className="mx-auto max-w-4xl p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold mb-4">Create listing</h1>

          {/* Agent / owner card */}
          {me && (
            <div className="rounded-xl border px-4 py-3 text-sm bg-white/5">
              <div className="font-semibold mb-1">Your contact</div>
              <div>
                <b>Name:</b> {me.name || "-"}
              </div>
              <div>
                <b>Email:</b> {me.email}
              </div>
              <div>
                <b>Role:</b> {me.role}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded border p-2 bg-transparent"
            placeholder="Title (e.g., Sunny 2BR Condo near Downtown)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <textarea
            className="w-full rounded border p-2 bg-transparent min-h-[140px]"
            placeholder="Describe key features, upgrades, and neighborhood"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              className="rounded border p-2 bg-transparent"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            >
              <option value="RENT">Rent</option>
              <option value="SALE">Sale</option>
            </select>

            <select
              className="rounded border p-2 bg-transparent"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as any)}
            >
              <option value="APARTMENT">APARTMENT</option>
              <option value="HOUSE">HOUSE</option>
              <option value="VILLA">VILLA</option>
              <option value="CONDO">CONDO</option>
              <option value="TOWNHOUSE">TOWNHOUSE</option>
              <option value="LAND">LAND</option>
              <option value="OTHER">OTHER</option>
            </select>

            <input
              className="rounded border p-2 bg-transparent"
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price  — e.g., 250000 for $250,000.00"
            />

            {/* 👇 currency block updated */}
            <div className="flex gap-2">
              <select
                className="rounded border p-2 bg-transparent w-[70%]"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {/* show currently typed custom currency too */}
                {!CURRENCIES.includes(currency) && currency.trim() !== "" && (
                  <option value={currency}>{currency}</option>
                )}
                <option value="">Other…</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="rounded border p-2 bg-transparent w-[30%] uppercase"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="ISO (e.g., USD)"
                title="3-letter currency code (e.g., USD, EUR, INR)"
                maxLength={6}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              className="rounded border p-2 bg-transparent"
              type="number"
              min={0}
              step={1}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="Bedrooms (e.g., 3)"
            />
            <input
              className="rounded border p-2 bg-transparent"
              type="number"
              min={0}
              step={1}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              placeholder="Bathrooms (e.g., 2)"
            />
            <input
              className="rounded border p-2 bg-transparent"
              type="number"
              min={0}
              step={1}
              value={areaSqft}
              onChange={(e) => setAreaSqft(e.target.value)}
              placeholder="Area (sqft), e.g., 1450"
            />
            <input
              className="rounded border p-2 bg-transparent"
              type="number"
              min={1800}
              max={2100}
              step={1}
              value={yearBuilt}
              onChange={(e) =>
                setYearBuilt(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Year Built (e.g., 2003)"
            />
          </div>

          <input
            className="w-full rounded border p-2 bg-transparent"
            placeholder="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              className="rounded border p-2 bg-transparent"
              placeholder="City (e.g., Boulder)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              className="rounded border p-2 bg-transparent"
              placeholder="State/Region (e.g., CO)"
              value={state}
              onChange={(e) => setStateVal(e.target.value)}
            />
            <input
              className="rounded border p-2 bg-transparent"
              placeholder="Postal Code (e.g., 80304)"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
            <input
              className="rounded border p-2 bg-transparent"
              placeholder="Country (e.g., United States)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded border p-2 bg-transparent"
              placeholder="Latitude (e.g., 40.0177)"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <input
              className="rounded border p-2 bg-transparent"
              placeholder="Longitude (e.g., -105.2750)"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>

          {category === "RENT" && (
            <div className="grid grid-cols-2 gap-3">
              <select
                className="rounded border p-2 bg-transparent"
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
              >
                <option value="">Period</option>
                <option value="MO">MO</option>
                <option value="WK">WK</option>
              </select>

              <input
                className="rounded border p-2 bg-transparent"
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
              />
            </div>
          )}

          <PhotoUploader onAdd={addPhoto} />

          <textarea
            className="w-full rounded border p-2 bg-transparent min-h-[120px]"
            placeholder="Photo URLs (one per line). Uploading images above will auto-fill here."
            value={photoUrls}
            onChange={(e) => setPhotoUrls(e.target.value)}
          />

          <textarea
            className="w-full rounded border p-2 bg-transparent min-h-[80px]"
            placeholder="Amenities (comma separated, e.g. Parking, Pool, Gym)"
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
          />

          <button disabled={busy} className="rounded bg-blue-600 px-4 py-2 font-medium">
            {busy ? "Creating…" : "Create listing"}
          </button>
        </form>
      </main>
    </RoleGate>
  );
}
