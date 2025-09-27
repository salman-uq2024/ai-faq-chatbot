"use client";

import type { PropsWithChildren } from "react";
import useSWR, { SWRConfig } from "swr";

const fetcher = async (input: string | URL | Request) => {
  const response = await fetch(input);
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
