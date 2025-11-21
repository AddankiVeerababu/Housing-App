// web/app/buy/page.tsx
import MapView from "@/components/MapView";
import Filters from "@/components/Filters";
import { getListings } from "@/lib/api";
import Link from "next/link";
import RoleGate from "@/components/RoleGate";

export const dynamic = "force-dynamic";

function money(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toLocaleString()}`;
  }
}

type SP = Record<string, string | string[] | undefined>;

async function normalizeSearchParams(searchParams: SP | Promise<SP> | undefined) {
  const raw = (await searchParams) ?? {};
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) params[k] = v[0] ?? "";
    else if (v !== undefined) params[k] = String(v);
  }
  return params;
}

export default async function BuyPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const params = await normalizeSearchParams(searchParams as any);
  const listings = await getListings(params);

  return (
    <RoleGate allowed={["BUYER", "RENTER"]}>
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-3xl font-semibold mb-4">Homes for Sale &amp; Rent</h1>

        <Filters />

        <h2 className="text-xl font-semibold mb-2 mt-6">Map</h2>
        <MapView />
        <div className="h-6" />

        {listings.length === 0 ? (
          <div className="rounded-lg border p-8 text-gray-600">
            No listings match these filters.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l) => (
              <li key={l.id} className="rounded-xl border hover:shadow-sm transition">
                <Link href={`/property/${l.id}`} className="block p-4">
                  <div className="text-sm text-gray-500 mb-1">
                    {l.category} • {l.propertyType}
                  </div>
                  <h2 className="text-lg font-medium">{l.title}</h2>
                  {/* price is stored in cents → divide by 100 here */}
                  <div className="mt-2 text-2xl">{money((l.price ?? 0) / 100, l.currency)}</div>
                  <div className="mt-1 text-gray-600">
                    {l.city || "-"}, {l.state || "-"}
                  </div>
                  <div className="mt-2 text-gray-500 text-sm">
                    {l.bedrooms ?? 0} bd • {l.bathrooms ?? 0} ba
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </RoleGate>
  );
}
