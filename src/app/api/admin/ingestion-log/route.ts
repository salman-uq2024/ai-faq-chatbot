import { NextResponse } from "next/server";
import { getIngestionLog } from "@/lib/storage";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { checkOriginAllowed, enforceRateLimit, getOrigin } from "@/lib/security";

export async function GET(request: Request) {
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

  const log = await getIngestionLog();
  return NextResponse.json({ entries: log });
}
