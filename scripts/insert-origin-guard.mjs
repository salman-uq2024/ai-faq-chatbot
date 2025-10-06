import fs from 'node:fs';

const files = [
  'src/app/api/admin/settings/route.ts',
  'src/app/api/admin/ingestion-log/route.ts',
  'src/app/api/admin/ingest/route.ts',
  'src/app/api/query/route.ts',
];

const guard = `  if (!isAllowedOrigin(req)) { return NextResponse.json({ error: "Origin not allowed" }, { status: 403 }); }\n`;

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('isAllowedOrigin')) {
    s = s.replace(
      /(^\s*import\s+\{\s*NextResponse\s*\}\s+from\s+"next\/server";?)/m,
      `$1\nimport { isAllowedOrigin } from "@/lib/origin";`
    );
  }
  s = s.replace(
    /(export\s+async\s+function\s+GET\s*\(\s*req:\s*Request[^)]*\)\s*\{\s*\n)/m,
    (m) => m + guard
  );
  s = s.replace(
    /(export\s+async\s+function\s+POST\s*\(\s*req:\s*Request[^)]*\)\s*\{\s*\n)/m,
    (m) => m + guard
  );
  fs.writeFileSync(f, s);
  console.log('patched', f);
}
