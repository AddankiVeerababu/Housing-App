"use client";

import { API_BASE } from "./api";

export type User = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  createdAt?: string;
};

async function jsonFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include", // <-- send/receive HTTP-only cookie
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data as T;
}

export async function signup(data: {
  email: string;
  password: string;
  name?: string;
  role?: "BUYER" | "SELLER" | "RENTER" | "AGENT";
  phone?: string;
}): Promise<User> {
  const json = await jsonFetch<{ user: User }>(`${API_BASE}/signup`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return json.user;
}

export async function login(data: { email: string; password: string }): Promise<User> {
  const json = await jsonFetch<{ user: User }>(`${API_BASE}/login`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return json.user;
}

export async function me(): Promise<User | null> {
  const json = await jsonFetch<{ user: User | null }>(`${API_BASE}/me`, { method: "GET" }).catch(
    () => ({ user: null })
  );
  return json.user;
}

export async function logout(): Promise<void> {
  await jsonFetch(`${API_BASE}/logout`, { method: "POST" });
}

// simple client hook
import { useEffect, useState, useCallback } from "react";
export function useMe() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await me());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { user, loading, refresh };
}
