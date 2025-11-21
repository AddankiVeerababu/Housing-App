// web/app/sell/page.tsx
import Link from "next/link";
import RoleGate from "@/components/RoleGate";

export const dynamic = "force-dynamic";

export default function SellHome() {
  return (
    <RoleGate allowed={["SELLER"]}>
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold mb-6">Sell dashboard</h1>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/sell/new"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Create listing
          </Link>

          <Link
            href="/sell/my"
            className="px-4 py-2 rounded border hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            My listings
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Only Sellers can access this area. Buyers/Renters will be redirected to Buy / Rent.
        </p>
      </main>
    </RoleGate>
  );
}
