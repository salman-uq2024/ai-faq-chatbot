import Link from "next/link";
import { getSettings } from "@/lib/storage";

export default async function Home() {
  const settings = await getSettings();
  const primaryOrigin = settings.allowOrigins[0] ?? "";
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            AI FAQ Chatbot for your docs.
          </h1>
          <p className="max-w-xl text-lg text-slate-600">
            Ingest documentation or PDFs and answer user questions with grounded, citeable responses. Simple admin. Easy
            embed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
            >
              Try the demo
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Go to admin
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Crawl & embed</div>
              <div className="mt-1">Point to your docs or PDFs. We chunk + embed.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Grounded answers</div>
              <div className="mt-1">Citations and rate‑limits out of the box.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Embeddable widget</div>
              <div className="mt-1">One script tag. Your brand color.</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-900">Embed snippet</div>
          <pre className="mt-3 rounded-xl bg-slate-900 p-4 text-xs text-slate-100 shadow-inner">
{`<script src="${primaryOrigin}/widget.js"
        data-api-url="${primaryOrigin}/api/query"
        data-button-text="Need help?"
        data-brand-color="${settings.brandColor}"
        async></script>`}
          </pre>
          <p className="mt-3 text-xs text-slate-500">Add your host origin to the allowlist in Admin settings.</p>
        </div>
      </section>
    </div>
  );
}
