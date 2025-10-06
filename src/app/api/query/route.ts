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
    response.headers.set("Vary", "Origin");
  } else {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Max-Age", PREFLIGHT_MAX_AGE_SECONDS);

  return response;
}

export async function OPTIONS(request: Request) {
  const origin = getOrigin(request);
  const host = request.headers.get("host");
  if (!(await checkOriginAllowed(origin, host))) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  return withCors(new NextResponse(null, { status: 204 }), origin);
}

const querySchema = z.object({
  question: z.string().min(1),
});

export async function POST(request: Request) {
  const origin = getOrigin(request);
  const host = request.headers.get("host");
  if (!(await checkOriginAllowed(origin, host))) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const jsonWithCors = (payload: unknown, init?: ResponseInit) =>
    withCors(NextResponse.json(payload, init), origin);

  const rate = await enforceRateLimit(request);
  if (!rate.success) {
    return jsonWithCors({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = querySchema.safeParse(payload);

  if (!parsed.success) {
    return jsonWithCors({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await runRagPipeline(parsed.data.question);
  return jsonWithCors(result);
}
