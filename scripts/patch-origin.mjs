import fs from 'node:fs';

const fp = 'src/lib/security.ts';
let s = fs.readFileSync(fp, 'utf8');

s = s.replace(
  /export\s+function\s+getOrigin\s*\(\s*request:\s*Request\s*\)\s*:\s*string\s*\|\s*null\s*\{[\s\S]*?\}\s*/m,
  `export function getOrigin(request: Request): string | null {
  const o = request.headers.get("origin");
  if (o && o !== "null") return o;
  const ref = request.headers.get("referer");
  if (ref) { try { const u = new URL(ref); return \`\${u.protocol}//\${u.host}\`; } catch {} }
  const host = request.headers.get("host");
  return host ? \`https://\${host}\` : null;
}
`
);

s = s.replace(
  /export\s+async\s+function\s+checkOriginAllowed\s*\(\s*origin:\s*string\s*\|\s*null\s*\)\s*:\s*Promise<boolean>\s*\{[\s\S]*?\}\s*/m,
  `export async function checkOriginAllowed(origin: string | null): Promise<boolean> {
  if (!origin || origin === "null") return true;
  const norm = normalize(origin);
  const envRaw = process.env.ORIGIN_ALLOWLIST ?? "";
  const env = envRaw.split(/[,\s]+/).filter(Boolean).map(normalize);
  let cfg = [] as string[];
  try { const settings = await getSettings(); cfg = (settings.allowOrigins ?? []).map(normalize); } catch {}
  const allow = new Set([...env, ...cfg]);
  return allow.has(norm);
}
function normalize(v: string): string {
  try { const u = new URL(v); return \`\${u.protocol}//\${u.host}\`; }
  catch { return v.trim().toLowerCase().replace(/\\/$/, ""); }
}
`
);

fs.writeFileSync(fp, s);
console.log('patched', fp);
