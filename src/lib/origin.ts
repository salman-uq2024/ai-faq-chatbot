export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? "";
  const host = req.headers.get("host") ?? "";
  const allow = (process.env.ORIGIN_ALLOWLIST ?? "")
    .split(/[,\s]+/)
    .filter(Boolean);
  return (
    (origin && allow.includes(origin)) ||
    allow.includes(`https://${host}`) ||
    allow.includes(`http://${host}`)
  );
}
