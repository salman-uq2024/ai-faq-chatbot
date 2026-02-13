import { NextResponse } from "next/server";
import {
  clearChunks,
  clearIngestionLog,
  getKnowledgeBaseStats,
} from "@/lib/storage";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { checkOriginAllowed, enforceRateLimit, getOrigin } from "@/lib/security";

async function authorizeRequest(request: Request): Promise<NextResponse | null> {
  const origin = getOrigin(request);
  const host = request.headers.get("host");
  if (!(await checkOriginAllowed(origin, host))) {
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
  return null;
}

export async function GET(request: Request) {
  const denied = await authorizeRequest(request);
  if (denied) {
    return denied;
  }

  const stats = await getKnowledgeBaseStats();
  return NextResponse.json(stats);
}

export async function DELETE(request: Request) {
  const denied = await authorizeRequest(request);
  if (denied) {
    return denied;
  }

  await clearChunks();
  await clearIngestionLog();
  const stats = await getKnowledgeBaseStats();
  return NextResponse.json({ status: "ok", stats });
}
