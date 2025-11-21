// components/RoleGate.tsx
"use client";

import useSWR from "swr";
import React from "react";

type Role = "BUYER" | "RENTER" | "SELLER" | "AGENT";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
} | null;

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then(async (r) => {
    if (!r.ok) throw new Error("auth fetch failed");
    return r.json();
  });

type Props = {
  /** Preferred prop */
  allow?: Role[];
  /** Back-compat: some pages used `allowed` */
  allowed?: Role[];
  /** What to render if user missing or not permitted */
  fallback?: React.ReactNode;
  /** Protected content */
  children: React.ReactNode;
};

export default function RoleGate({
  allow,
  allowed,
  fallback,
  children,
}: Props) {
  // support both prop names
  const requiredRoles: Role[] = allowed ?? allow ?? [];

  const { data, error, isLoading, mutate } = useSWR(
    `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"}/me`,
    fetcher,
    { revalidateOnFocus: true }
  );

  const user: SessionUser = data?.user ?? null;

  // Loading state
  if (isLoading) {
    return (
      <main className="mx-auto max-w-xl p-6 text-center text-gray-500">
        Checking access…
      </main>
    );
  }

  // If fetch failed, treat as not authenticated
  if (error) {
    return (
      <main className="mx-auto max-w-xl p-6 text-center text-red-600">
        Unable to verify your session.
      </main>
    );
  }

  // If caller did not specify any roles, just require that a user exists
  if (requiredRoles.length === 0) {
    if (!user) {
      return (
        <main className="mx-auto max-w-xl p-6 text-center text-gray-500">
          {fallback ?? "Please sign in to continue."}
        </main>
      );
    }
    return <>{children}</>;
  }

  // If roles specified, enforce them
  if (!user || !requiredRoles.includes(user.role)) {
    return (
      <main className="mx-auto max-w-xl p-6 text-center text-gray-500">
        {fallback ?? "Access denied"}
      </main>
    );
  }

  return <>{children}</>;
}
