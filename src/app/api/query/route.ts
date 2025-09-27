import { NextResponse } from "next/server";
import { z } from "zod";
import { runRagPipeline } from "@/lib/rag";
import { checkOriginAllowed, enforceRateLimit, getOrigin } from "@/lib/security";

const querySchema = z.object({
  question: z.string().min(3),
});

export async function POST(request: Request) {
  const origin = getOrigin(request);
  if (!(await checkOriginAllowed(origin))) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const rate = await enforceRateLimit(request);
  if (!rate.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = querySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await runRagPipeline(parsed.data.question);
  return NextResponse.json(result);
}
