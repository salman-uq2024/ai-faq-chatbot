import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/origin";
import { z } from "zod";
import { getSettings, updateSettings } from "@/lib/storage";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { enforceRateLimit, checkOriginAllowed, getOrigin } from "@/lib/security";

const updateSchema = z.object({
  model: z.string().min(1).optional(),
  maxTokens: z.number().int().min(64).max(4096).optional(),
  brandColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  allowOrigins: z.array(z.string().url()).optional(),
});

export async function GET(request: Request) {
  const origin = getOrigin(request);
  if (!(await checkOriginAllowed(origin))) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }
  const adminCheck = verifyAdminRequest(request);
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error ?? "Unauthorized" }, { status: 401 });
  }
  const rate = await enforceRateLimit(request);
  if (!rate.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const origin = getOrigin(request);
  if (!(await checkOriginAllowed(origin))) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }
  const adminCheck = verifyAdminRequest(request);
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error ?? "Unauthorized" }, { status: 401 });
  }
  const rate = await enforceRateLimit(request);
  if (!rate.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateSettings(parsed.data);
  return NextResponse.json(updated);
}
