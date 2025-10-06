import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/origin";
import { z } from "zod";
import { ingestSources } from "@/lib/ingest/pipeline";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { checkOriginAllowed, enforceRateLimit, getOrigin } from "@/lib/security";

const ingestSchema = z.object({
  baseUrl: z.string().url().optional(),
  crawlDepth: z.number().int().min(0).max(3).default(2),
  maxPages: z.number().int().min(1).max(25).default(10),
  pdfUrls: z.array(z.string().url()).default([]),
  chunkSize: z.number().int().min(100).max(2000).optional(),
  chunkOverlap: z.number().int().min(0).max(500).optional(),
});

export async function POST(request: Request) {
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
  const parsed = ingestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await ingestSources(parsed.data);
    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    console.error("Ingestion failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 },
    );
  }
}
