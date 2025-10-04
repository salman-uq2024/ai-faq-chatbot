"use client";

import type { PropsWithChildren } from "react";
import useSWR, { SWRConfig } from "swr";

export const ADMIN_TOKEN_STORAGE_KEY = "ai-faq-admin-token";

const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));

  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error ?? response.statusText);
    throw error;
  }
  return response.json();
};

export function Providers({ children }: PropsWithChildren) {
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>;
}

export { useSWR };
