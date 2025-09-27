import { NextResponse } from "next/server";
import { getIngestionLog } from "@/lib/storage";
import { checkOriginAllowed, enforceRateLimit, getOrigin } from "@/lib/security";

export async function GET(request: Request) {
  const origin = getOrigin(request);
  if (!(await checkOriginAllowed(origin))) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const rate = await enforceRateLimit(request);
  if (!rate.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const log = await getIngestionLog();
  return NextResponse.json({ entries: log });
}
