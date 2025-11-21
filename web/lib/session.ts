// web/lib/session.ts
"use client";

import useSWR from "swr";

export type Role = "BUYER" | "RENTER" | "SELLER";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

type MeResponse =
  | { user: SessionUser }                 // logged in
  | { user: null };                       // not logged in

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!r.ok) throw new Error(`auth fetch failed: ${r.status}`);
  return (await r.json()) as MeResponse;
};

/** Client-side hook to read the logged-in user from the API cookie */
export function useSession() {
  const { data, error, isLoading, mutate } = useSWR<MeResponse>(
    `${process.env.NEXT_PUBLIC_API_BASE}/me`,
    fetcher,
    { revalidateOnFocus: true }
  );

  return {
    user: (data?.user ?? null) as SessionUser | null,
    loading: isLoading,
    error,
    refresh: () => void mutate(),
  };
}

export async function logout() {
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });
}
