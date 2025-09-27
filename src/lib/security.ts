import { getSettings } from "./storage";

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const DEFAULT_LIMIT = 30;

export type RateLimitCheck = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

function now(): number {
  return Date.now();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getOrigin(request: Request): string | null {
  return request.headers.get("origin") ?? request.headers.get("referer");
}

export async function checkOriginAllowed(origin: string | null): Promise<boolean> {
  if (!origin) {
    return true;
  }
  try {
    const url = new URL(origin);
    const normalized = `${url.protocol}//${url.host}`;
    const settings = await getSettings();
    return settings.allowOrigins.includes(normalized);
  } catch {
    return false;
  }
}

export async function enforceRateLimit(request: Request): Promise<RateLimitCheck> {
  const origin = getOrigin(request) ?? "unknown";
  const ip = getClientIp(request);
  const key = `${origin}:${ip}`;
  const limit = Number(process.env.RATE_LIMIT_PER_MINUTE ?? DEFAULT_LIMIT);
  const ttl = 60_000; // 1 minute

  const bucket = rateLimitBuckets.get(key);
  const timestamp = now();

  if (!bucket || bucket.resetAt <= timestamp) {
    const resetAt = timestamp + ttl;
    rateLimitBuckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);
  return { success: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}
