"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, logout } from "@/lib/session";

export default function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, refresh } = useSession();

  // Hide the middle nav only on auth pages
  const hideMainNav = pathname === "/login" || pathname === "/register";

  const onLogout = async () => {
    await logout();
    refresh();
    window.location.href = "/login";
  };

  return (
    <header className="border-b bg-white dark:bg-neutral-900 sticky top-0 z-10">
      <div className="mx-auto max-w-6xl p-4 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="text-lg font-semibold text-blue-600 hover:underline">
          Housing
        </Link>

        {/* Middle nav – role aware, hidden on login/register */}
        {!hideMainNav && (
          <nav className="flex gap-5 text-sm text-gray-700 dark:text-gray-200">
            {(user?.role === "BUYER" || user?.role === "RENTER" || !user) && (
              <Link
                href="/buy"
                className={pathname?.startsWith("/buy") ? "underline" : undefined}
              >
                Buy / Rent
              </Link>
            )}

            {user?.role === "SELLER" && (
              <>
                <Link
                  href="/sell/new"
                  className={pathname?.startsWith("/sell/new") ? "underline" : undefined}
                >
                  Create Listing
                </Link>
                <Link
                  href="/sell/my"
                  className={pathname?.startsWith("/sell/my") ? "underline" : undefined}
                >
                  My Listings
                </Link>
              </>
            )}

            {/* Map is fine for everyone */}
           
          </nav>
        )}

        {/* Right side – auth status */}
        <div className="text-sm">
          {loading ? (
            <span className="opacity-70">…</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="opacity-80">
                Hi, {user.name?.split(" ")[0] || user.email.split("@")[0]}
              </span>
              <button
                onClick={onLogout}
                className="rounded px-2 py-1 border hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <Link href="/login" className="hover:underline">
                Login
              </Link>
              <Link href="/register" className="hover:underline">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
