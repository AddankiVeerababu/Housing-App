// web/components/Filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function dollarsToCents(input: string): number | undefined {
  if (input.trim() === "") return undefined;
  const n = Number(input.replace(/[, ]/g, ""));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function toInt(input: string): number | undefined {
  if (input.trim() === "") return undefined;
  const n = Number(input);
  if (!Number.isFinite(n)) return undefined;
  return Math.floor(n);
}

export default function Filters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [city, setCity] = useState(sp.get("city") ?? "");
  const [state, setState] = useState(sp.get("state") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [propertyType, setPropertyType] = useState(sp.get("propertyType") ?? "");
  const [minPrice, setMinPrice] = useState(sp.get("minPrice") ? String(Number(sp.get("minPrice")) / 100) : ""); // show dollars
  const [maxPrice, setMaxPrice] = useState(sp.get("maxPrice") ? String(Number(sp.get("maxPrice")) / 100) : ""); // show dollars
  const [bedrooms, setBedrooms] = useState(sp.get("bedrooms") ?? "");

  // keep in sync when URL changes (e.g., Clear)
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setCity(sp.get("city") ?? "");
    setState(sp.get("state") ?? "");
    setCategory(sp.get("category") ?? "");
    setPropertyType(sp.get("propertyType") ?? "");
    setMinPrice(sp.get("minPrice") ? String(Number(sp.get("minPrice")) / 100) : "");
    setMaxPrice(sp.get("maxPrice") ? String(Number(sp.get("maxPrice")) / 100) : "");
    setBedrooms(sp.get("bedrooms") ?? "");
  }, [sp]);

  const buildQuery = useCallback(() => {
    const next = new URLSearchParams();

    // text-y fields
    if (q.trim()) next.set("q", q.trim());
    if (city.trim()) next.set("city", city.trim());
    if (state.trim()) next.set("state", state.trim());

    // enums
    if (category) next.set("category", category);
    if (propertyType) next.set("propertyType", propertyType);

    // numeric conversions
    const minCents = dollarsToCents(minPrice);
    const maxCents = dollarsToCents(maxPrice);
    const beds = toInt(bedrooms);

    if (minCents !== undefined) next.set("minPrice", String(minCents));
    if (maxCents !== undefined) next.set("maxPrice", String(maxCents));
    if (beds !== undefined) next.set("bedrooms", String(beds));

    return next;
  }, [q, city, state, category, propertyType, minPrice, maxPrice, bedrooms]);

  const apply = useCallback(() => {
    const next = buildQuery();
    router.replace(`${pathname}?${next.toString()}`);
  }, [buildQuery, pathname, router]);

  const clear = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      apply();
    }
  };

  return (
    <div className="rounded-xl border p-4 mb-4 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search title…"
        className="border rounded px-2 py-1 bg-transparent"
      />
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="City"
        className="border rounded px-2 py-1 bg-transparent"
      />
      <input
        value={state}
        onChange={(e) => setState(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="State"
        className="border rounded px-2 py-1 bg-transparent"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onKeyDown={onKeyDown}
        className="border rounded px-2 py-1 bg-transparent"
      >
        <option value="">Any Category</option>
        <option value="SALE">SALE</option>
        <option value="RENT">RENT</option>
      </select>
      <select
        value={propertyType}
        onChange={(e) => setPropertyType(e.target.value)}
        onKeyDown={onKeyDown}
        className="border rounded px-2 py-1 bg-transparent"
      >
        <option value="">Any Type</option>
        <option value="HOUSE">HOUSE</option>
        <option value="CONDO">CONDO</option>
        <option value="APARTMENT">APARTMENT</option>
        <option value="TOWNHOUSE">TOWNHOUSE</option>
        <option value="VILLA">VILLA</option>
        <option value="LAND">LAND</option>
        <option value="OTHER">OTHER</option>
      </select>
      <input
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Min $"
        className="border rounded px-2 py-1 bg-transparent"
        inputMode="decimal"
      />
      <input
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Max $"
        className="border rounded px-2 py-1 bg-transparent"
        inputMode="decimal"
      />
      <input
        value={bedrooms}
        onChange={(e) => setBedrooms(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Beds ≥"
        className="border rounded px-2 py-1 bg-transparent"
        inputMode="numeric"
      />
      <div className="col-span-full flex gap-2">
        <button onClick={apply} className="px-3 py-1 rounded bg-blue-600 text-white">
          Apply
        </button>
        <button onClick={clear} className="px-3 py-1 rounded border">
          Clear
        </button>
      </div>
    </div>
  );
}
