// web/hooks/useSession.ts
"use client";

import useSWR from "swr";

export type Role = "BUYER" | "RENTER" | "SELLER" | "AGAIN" | "AGENT";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

type MeResponse = { user: SessionUser | null };

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!r.ok) {
    throw new Error(`auth fetch failed: ${r.status}`);
  }
  return (await r.json()) as MeResponse;
};

/**
 * Read the current session (via /me) and expose role helpers.
 */
export function useSession() {
  const { data, error, isLoading, mutate } = useSWR<MeResponse>(
    `${process.env.NEXT_PUBLIC_API_BASE}/me`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const user = data?.user ?? null;
  const role = user?.role;

  return {
    user,
    loading: Boolean(isLoading && !data && !error),
    error: error as Error | undefined,
    refresh: () => void mutate(),

    // handy role guards
    isBuyer: role === "BUYER" || role === "RENTER",
    isSeller: role === "SELLER",
    isAgent: role === "AGENT",
  };
}

export default useSession;
