import { NextResponse } from "next/server";
import { z } from "zod";
import { runRagPipeline } from "@/lib/rag";
import { checkOriginAllowed, enforceRateLimit, getOrigin } from "@/lib/security";

const ALLOWED_METHODS = "POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";
const PREFLIGHT_MAX_AGE_SECONDS = "86400";

function withCors(response: NextResponse, origin: string | null) {
  // For opaque origins (e.g., file:// → "null") or missing origin, return wildcard
  if (origin && origin !== "null") {
    response.headers.set("Access-Control-Allow-Origin", origin);
    const vary = response.headers.get("Vary");
    response.headers.set("Vary", vary ? `${vary}, Origin` : "Origin");
  } else {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Max-Age", PREFLIGHT_MAX_AGE_SECONDS);

  return response;
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

function withRateLimitHeaders(
  response: NextResponse,
  rateLimit: { remaining: number; resetAt: number } | null,
) {
  if (!rateLimit) {
    return response;
  }
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, rateLimit.remaining)));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(rateLimit.resetAt / 1000)));
  return response;
}

export async function OPTIONS(request: Request) {
  const origin = getOrigin(request);
  const host = request.headers.get("host");
  if (!(await checkOriginAllowed(origin, host))) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  return withSecurityHeaders(withCors(new NextResponse(null, { status: 204 }), origin));
}

const querySchema = z.object({ question: z.string().trim().min(1) });

export async function POST(request: Request) {
  const origin = getOrigin(request);
  const host = request.headers.get("host");
  if (!(await checkOriginAllowed(origin, host))) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const jsonWithCors = (payload: unknown, init?: ResponseInit) =>
    withSecurityHeaders(withCors(NextResponse.json(payload, init), origin));

  const rate = await enforceRateLimit(request);
  if (!rate.success) {
    const response = jsonWithCors({ error: "Rate limit exceeded" }, { status: 429 });
    response.headers.set(
      "Retry-After",
      String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
    );
    return withRateLimitHeaders(response, rate);
  }

  const payload = await request.json().catch(() => null);
  const parsed = querySchema.safeParse(payload);

  if (!parsed.success) {
    return withRateLimitHeaders(jsonWithCors({ error: parsed.error.flatten() }, { status: 400 }), rate);
  }

  try {
    const result = await runRagPipeline(parsed.data.question);
    return withRateLimitHeaders(jsonWithCors(result), rate);
  } catch (error) {
    console.error("Query pipeline failed", error);
    return withRateLimitHeaders(
      jsonWithCors({ error: "Unable to process the question right now." }, { status: 500 }),
      rate,
    );
  }
}
