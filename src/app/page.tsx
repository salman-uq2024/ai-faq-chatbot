import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSettings } from "@/lib/storage";

const sellingPoints = [
  {
    title: "Crawl & Crunch",
    description: "Point the bot at your docs or PDFs and we handle cleaning, chunking, and vectorisation automatically.",
  },
  {
    title: "Secure by Default",
    description: "Origin allowlists, per-origin rate limiting, and server-only model calls keep your data safe.",
  },
  {
    title: "No-Key Demo",
    description: "Run a local TF-IDF fallback when keys are missing, or drop in Gemini keys for production quality.",
  },
];

const workflow: Array<{
  step: string;
  title: string;
  description: ReactNode;
}> = [
  {
    step: "1",
    title: "Install",
    description: "Clone the repo, copy .env.example, and run npm install.",
  },
  {
    step: "2",
    title: "Ingest",
    description: "Head to /admin, enter your docs base URL, and let the crawler ingest up to 10 pages by default.",
  },
  {
    step: "3",
    title: "Embed",
    description: (
      <>
        Drop <code className="bg-slate-100 px-1">&lt;script src=&quot;/widget.js&quot; async&gt;&lt;/script&gt;</code> into any site to launch an embeddable helper.
      </>
    ),
  },
];

export default async function Home() {
  const settings = await getSettings();
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div
          className="mx-auto aspect-[3/2] w-[72rem] bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 opacity-20"
        />
      </div>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-24 sm:px-10">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              AI FAQ Chatbot
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Launch a branded AI assistant for your docs in minutes.
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              Ingest documentation, FAQs, or PDFs, then answer customer questions with grounded, citeable responses. Works with Gemini or in offline demo mode without keys.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Go to Admin
              </Link>
              <a
                href="#embed"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                Embed the widget
              </a>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Model</dt>
                <dd className="text-base font-semibold text-slate-900">{settings.model}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Max tokens</dt>
                <dd className="text-base font-semibold text-slate-900">{settings.maxTokens}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Default brand</dt>
                <dd className="text-base font-semibold text-slate-900">{settings.brandColor}</dd>
              </div>
            </dl>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
            <Image
              src="/demo-landing.png"
              alt="AI FAQ Chatbot landing page mockup"
              width={640}
              height={360}
              className="h-auto w-full"
              priority
            />
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sellingPoints.map((point) => (
            <div key={point.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{point.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{point.description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">Operate with confidence</h2>
            <p className="text-sm text-slate-600">
              The admin panel keeps ingestion, branding, and configuration in one place. Track crawl jobs, tweak chunking, and roll out updates without redeploying.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>- Rate limiting and origin allowlist controls ship by default.</li>
              <li>- Server-only environment variables keep API keys off the client.</li>
              <li>- Works with or without Gemini credentials so anyone can demo locally.</li>
            </ul>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
            <Image
              src="/demo-admin.png"
              alt="Admin dashboard preview"
              width={640}
              height={360}
              className="h-auto w-full"
            />
          </div>
        </section>

        <section id="embed" className="rounded-3xl border border-blue-100 bg-blue-50 px-6 py-10 shadow-sm sm:px-10">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-3">
              <h2 className="text-2xl font-semibold text-blue-950">Embed anywhere</h2>
              <p className="text-sm text-blue-900/80">
                Serve the widget on any domain that appears in your allowlist. The script reads live brand colors so you stay on brand.
              </p>
            </div>
            <pre className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-100 shadow-lg">
              {`<!-- Public embed -->\n<script src="${settings.allowOrigins[0] ?? ""}/widget.js" async></script>`}
            </pre>
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-slate-900">Workflow</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {workflow.map((item) => (
              <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
