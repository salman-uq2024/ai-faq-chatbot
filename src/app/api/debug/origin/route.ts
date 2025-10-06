import { NextResponse } from "next/server";
export function GET(req: Request) {
  const origin = req.headers.get("origin") ?? null;
  const host = req.headers.get("host") ?? null;
  const allowRaw = process.env.ORIGIN_ALLOWLIST ?? "";
  const allow = allowRaw.split(/[,\s]+/).filter(Boolean);
  return NextResponse.json({ origin, host, allow, allowRaw });
}
