// web/app/sell/my/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyListings,
  deleteListing,
  type Listing,
} from "@/lib/api";

function moneyCents(cents: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      (cents || 0) / 100
    );
  } catch {
    return `$${((cents || 0) / 100).toLocaleString()}`;
  }
}

export default function MyListingsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyListings();
        setItems(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load your listings");
      }
    })();
  }, []);

  async function onDelete(id: string) {
    if (!confirm("Delete this listing?")) return;
    try {
      setBusyId(id);
      await deleteListing(id);
      setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Listings</h1>
        <Link href="/sell/new" className="rounded bg-green-600 px-4 py-2 text-white">
          + Create listing
        </Link>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 mb-4 text-red-700">
          {error}
        </div>
      )}

      {!items ? (
        <div className="text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500">
          You have no listings yet.{" "}
          <Link href="/sell/new" className="text-blue-600 underline">
            Create one
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((l: any) => {
            const photo = l.photos?.[0]?.url;
            return (
              <div key={l.id} className="rounded-2xl border bg-white dark:bg-neutral-900">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt={l.title}
                    className="h-40 w-full object-cover rounded-t-2xl"
                  />
                ) : (
                  <div className="h-40 w-full bg-gray-100 rounded-t-2xl" />
                )}

                <div className="p-4">
                  <div className="text-xs text-gray-500 mb-1">
                    {l.category} • {l.propertyType}
                  </div>
                  <div className="font-medium mb-1 line-clamp-1">{l.title}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {moneyCents(l.price, l.currency)} • {l.city || "-"},{" "}
                    {l.state || ""}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/property/${l.id}`}
                      className="rounded bg-blue-600 px-3 py-1 text-white text-sm"
                    >
                      View
                    </Link>
                    <Link
                      href={`/sell/edit/${l.id}`}
                      className="rounded bg-amber-600 px-3 py-1 text-white text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      disabled={busyId === l.id}
                      onClick={() => onDelete(l.id)}
                      className="rounded bg-red-600 px-3 py-1 text-white text-sm disabled:opacity-60"
                    >
                      {busyId === l.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
