// web/app/sell/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Listing = {
  id: string;
  title: string;
  price: number;
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
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function SellHome() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/me/listings`, { credentials: "include" });
        if (res.status === 401 || res.status === 403) {
          // not a seller/agent or not logged in — send to login
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        setItems(data?.results ?? []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sell</h1>
        <Link href="/sell/new" className="px-3 py-2 rounded bg-blue-600 text-white">
          Create listing
        </Link>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-medium mb-3">My listings</h2>

        {loading ? (
          <div>Loading…</div>
        ) : err ? (
          <div className="text-red-500">{err}</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500">No listings yet. Click “Create listing”.</div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((l) => (
              <li key={l.id} className="border rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">
                  {l.category} • {l.propertyType}
                </div>
                <div className="font-medium">{l.title}</div>
                <div className="text-gray-600">
                  {(l.price / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: l.currency || "USD",
                  })}
                </div>
                <div className="text-sm text-gray-500">
                  {[l.city, l.state].filter(Boolean).join(", ")}
                </div>
                <div className="mt-2 flex gap-2">
                  <Link href={`/property/${l.id}`} className="text-blue-600 underline text-sm">
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
