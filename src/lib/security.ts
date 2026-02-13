import { getSettings } from "./storage";

const rateLimitBuckets = new Map<string, { count: number; resetAt: number; lastSeen: number }>();
const DEFAULT_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_BUCKET_COUNT = 5000;
const MIN_LIMIT = 1;
const MAX_LIMIT = 10_000;

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
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getOrigin(request: Request): string | null {
  const o = request.headers.get("origin");
  if (o && o !== "null") return o;
  const ref = request.headers.get("referer");
  if (ref) {
    try { const u = new URL(ref); return `${u.protocol}//${u.host}`; } catch {}
  }
  const host = request.headers.get("host");
  if (!host) {
    return null;
  }
  const proto = request.headers.get("x-forwarded-proto");
  const scheme = proto === "http" || proto === "https" ? proto : "https";
  return `${scheme}://${host}`;
}

export async function checkOriginAllowed(origin: string | null, requestHost?: string | null): Promise<boolean> {
  if (!origin || origin === "null") return true;

  if (requestHost) {
    const normalizedRequestHost = normalizeHost(requestHost);
    if (normalizedRequestHost) {
      try {
        const originHost = normalizeHost(new URL(origin).host);
        if (originHost && originHost === normalizedRequestHost) {
          return true;
        }
      } catch {
        // Invalid origin values are treated as untrusted and checked against allowlists.
      }
    }
  }

  const norm = normalize(origin);
  const envRaw = process.env.ORIGIN_ALLOWLIST ?? "";
  const env = envRaw.split(/[,\s]+/).filter(Boolean).map(normalize);
  let cfg: string[] = [];
  try {
    const settings = await getSettings();
    cfg = (settings.allowOrigins ?? []).map(normalize);
  } catch {}
  const allow = new Set<string>([...env, ...cfg]);
  return allow.has(norm);
}

function normalize(v: string): string {
  try {
    const u = new URL(v);
    const host = normalizeHost(u.host);
    return `${u.protocol}//${host ?? u.host}`.toLowerCase();
  } catch {
    return v.trim().toLowerCase().replace(/\/$/, "");
  }
}

function normalizeHost(host: string): string | null {
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("[")) {
    const closing = trimmed.indexOf("]");
    if (closing === -1) {
      return trimmed;
    }
    const hostPart = trimmed.slice(0, closing + 1);
    const portPart = trimmed.slice(closing + 1);
    if (!portPart.startsWith(":")) {
      return hostPart;
    }
    const port = portPart.slice(1);
    if (port === "80" || port === "443") {
      return hostPart;
    }
    return `${hostPart}:${port}`;
  }

  const separator = trimmed.lastIndexOf(":");
  if (separator <= 0 || trimmed.indexOf(":") !== separator) {
    return trimmed;
  }

  const hostname = trimmed.slice(0, separator);
  const port = trimmed.slice(separator + 1);
  if (port === "80") {
    return hostname;
  }
  if (port === "443") {
    return hostname;
  }
  return `${hostname}:${port}`;
}

function parseRateLimit(rawLimit: string | undefined): number {
  const parsed = Number(rawLimit ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  const rounded = Math.floor(parsed);
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, rounded));
}

function pruneRateLimitBuckets(timestamp: number) {
  if (rateLimitBuckets.size === 0) {
    return;
  }

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= timestamp) {
      rateLimitBuckets.delete(key);
    }
  }

  if (rateLimitBuckets.size <= MAX_BUCKET_COUNT) {
    return;
  }

  const oldest = [...rateLimitBuckets.entries()]
    .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
    .slice(0, rateLimitBuckets.size - MAX_BUCKET_COUNT);

  for (const [key] of oldest) {
    rateLimitBuckets.delete(key);
  }
}

export async function enforceRateLimit(request: Request): Promise<RateLimitCheck> {
  const origin = normalize(getOrigin(request) ?? "unknown");
  const ip = getClientIp(request);
  const key = `${origin}:${ip}`;
  const limit = parseRateLimit(process.env.RATE_LIMIT_PER_MINUTE);
  const ttl = RATE_LIMIT_WINDOW_MS;

  const bucket = rateLimitBuckets.get(key);
  const timestamp = now();
  if (rateLimitBuckets.size >= MAX_BUCKET_COUNT) {
    pruneRateLimitBuckets(timestamp);
  }

  if (!bucket || bucket.resetAt <= timestamp) {
    const resetAt = timestamp + ttl;
    rateLimitBuckets.set(key, { count: 1, resetAt, lastSeen: timestamp });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    bucket.lastSeen = timestamp;
    rateLimitBuckets.set(key, bucket);
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  bucket.lastSeen = timestamp;
  rateLimitBuckets.set(key, bucket);
  return { success: true, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}
