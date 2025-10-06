import fs from 'node:fs';

const fp = 'src/lib/security.ts';
let s = fs.readFileSync(fp, 'utf8');

function replaceFunction(code, declStarts, newBlock) {
  for (const declStart of declStarts) {
    let i = code.indexOf(declStart);
    if (i === -1) continue;
    const braceStart = code.indexOf('{', i);
    if (braceStart === -1) continue;
    let depth = 0, j = braceStart;
    for (; j < code.length; j++) {
      const ch = code[j];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { j++; break; }
      }
    }
    if (depth !== 0) throw new Error('Unbalanced braces while parsing ' + declStart);
    return code.slice(0, i) + newBlock + code.slice(j);
  }
  throw new Error('Function not found: ' + declStarts.join(' | '));
}

const getOriginNew = `
export function getOrigin(request: Request): string | null {
  const o = request.headers.get("origin");
  if (o && o !== "null") return o;
  const ref = request.headers.get("referer");
  if (ref) { try { const u = new URL(ref); return \`\${u.protocol}//\${u.host}\`; } catch {} }
  const host = request.headers.get("host");
  return host ? \`https://\${host}\` : null;
}
`.trim() + '\n';

const checkOriginNew = `
export async function checkOriginAllowed(origin: string | null): Promise<boolean> {
  if (!origin || origin === "null") return true;
  const norm = normalize(origin);
  const envRaw = process.env.ORIGIN_ALLOWLIST ?? "";
  const env = envRaw.split(/[,\s]+/).filter(Boolean).map(normalize);
  let cfg: string[] = [];
  try {
    const settings = await getSettings();
    cfg = (settings.allowOrigins ?? []).map(normalize);
  } catch {}
  const allow = new Set<string>([...env, ...cfg]);
  return allow.has(norm);
}
function normalize(v: string): string {
  try { const u = new URL(v); return \`\${u.protocol}//\${u.host}\`; }
  catch { return v.trim().toLowerCase().replace(/\\/$/, ""); }
}
`.trim() + '\n';

s = replaceFunction(s, ['export function getOrigin(', 'export function getOrigin ('], getOriginNew);
s = replaceFunction(s, ['export async function checkOriginAllowed(', 'export async function checkOriginAllowed ('], checkOriginNew);

fs.writeFileSync(fp, s);
console.log('repaired', fp);
