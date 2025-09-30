"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useSWR } from "@/components/providers";

type SettingsResponse = {
  model: string;
  maxTokens: number;
  brandColor: string;
  allowOrigins: string[];
};

type IngestionLogResponse = {
  entries: Array<{
    id: string;
    createdAt: string;
    summary: string;
    baseUrl?: string;
    pdfUrls?: string[];
    chunkCount: number;
  }>;
};

type IngestFormState = {
  baseUrl: string;
  pdfUrls: string;
  crawlDepth: number;
  maxPages: number;
  chunkSize: number;
  chunkOverlap: number;
};

const DEFAULT_FORM: IngestFormState = {
  baseUrl: "https://nextjs.org",
  pdfUrls: "",
  crawlDepth: 2,
  maxPages: 10,
  chunkSize: 320,
  chunkOverlap: 60,
};

export default function AdminPage() {
  const { data: settings, mutate: mutateSettings } = useSWR<SettingsResponse>("/api/admin/settings");
  const { data: log, mutate: mutateLog } = useSWR<IngestionLogResponse>("/api/admin/ingestion-log");

  const [form, setForm] = useState<IngestFormState>(DEFAULT_FORM);
  const [savingSettings, setSavingSettings] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [model, setModel] = useState("models/gemini-1.5-flash");
  const [maxTokens, setMaxTokens] = useState(512);
  const [brandColor, setBrandColor] = useState("#2563EB");
  const [allowOrigins, setAllowOrigins] = useState("http://localhost:3000");

  useEffect(() => {
    if (settings) {
      setModel(settings.model);
      setMaxTokens(settings.maxTokens);
      setBrandColor(settings.brandColor);
      setAllowOrigins(settings.allowOrigins.join("\n"));
    }
  }, [settings]);

  const logEntries = log?.entries ?? [];

  const primaryOrigin = useMemo(() => settings?.allowOrigins[0] ?? "http://localhost:3000", [settings]);

  const handleUpdateSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSettings(true);
    try {
      const origins = allowOrigins
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          maxTokens,
          brandColor,
          allowOrigins: origins,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ? JSON.stringify(payload.error) : response.statusText);
      }
      mutateSettings(payload, { revalidate: false });
    } catch (error) {
      console.error(error);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleIngest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIngesting(true);
    setIngestMessage(null);
    setIngestError(null);
    try {
      const payload = {
        baseUrl: form.baseUrl || undefined,
        pdfUrls: form.pdfUrls
          .split(/\s+/)
          .map((url) => url.trim())
          .filter(Boolean),
        crawlDepth: form.crawlDepth,
        maxPages: form.maxPages,
        chunkSize: form.chunkSize,
        chunkOverlap: form.chunkOverlap,
      };
      if (!payload.baseUrl && payload.pdfUrls.length === 0) {
        setIngestError("Provide a base URL or at least one PDF URL.");
        setIngesting(false);
        return;
      }
      const response = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ? JSON.stringify(data.error) : response.statusText);
      }
      setIngestMessage(`Ingested ${data.result.documents} documents and ${data.result.chunks} chunks.`);
      mutateLog();
    } catch (error) {
      setIngestError(error instanceof Error ? error.message : "Ingestion failed.");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Control centre</p>
        <h1 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-600">
          Configure your model, update branding, and ingest content. All LLM calls happen on the server; client bundles never include secrets.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card
          header="Ingest content"
          footer={<p>Need more than 25 pages? Adjust <code>maxPages</code> within the allowed range.</p>}
        >
          <form className="space-y-4" onSubmit={handleIngest}>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Base URL
              </label>
              <Input
                placeholder="https://docs.yourdomain.com"
                value={form.baseUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                PDF URLs (optional)
              </label>
              <Textarea
                placeholder="One URL per line"
                value={form.pdfUrls}
                onChange={(event) => setForm((prev) => ({ ...prev, pdfUrls: event.target.value }))}
                className="min-h-[120px]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Crawl depth</label>
                <Input
                  type="number"
                  min={0}
                  max={3}
                  value={form.crawlDepth}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, crawlDepth: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Page limit</label>
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={form.maxPages}
                  onChange={(event) => setForm((prev) => ({ ...prev, maxPages: Number(event.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Chunk size</label>
                <Input
                  type="number"
                  min={100}
                  max={2000}
                  value={form.chunkSize}
                  onChange={(event) => setForm((prev) => ({ ...prev, chunkSize: Number(event.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Overlap</label>
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={form.chunkOverlap}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, chunkOverlap: Number(event.target.value) }))
                  }
                />
              </div>
            </div>

            {ingestMessage && <Alert variant="success">{ingestMessage}</Alert>}
            {ingestError && <Alert variant="error">{ingestError}</Alert>}

            <div className="flex justify-end">
              <Button type="submit" loading={ingesting}>
                {ingesting ? "Ingesting" : "Start ingestion"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card header="Model & branding">
            <form className="space-y-3" onSubmit={handleUpdateSettings}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Model ID</label>
                <Input value={model} onChange={(event) => setModel(event.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Max output tokens</label>
                <Input
                  type="number"
                  min={64}
                  max={4096}
                  value={maxTokens}
                  onChange={(event) => setMaxTokens(Number(event.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Brand color</label>
                <Input value={brandColor} onChange={(event) => setBrandColor(event.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Origin allowlist</label>
                <Textarea
                  className="min-h-[100px]"
                  value={allowOrigins}
                  onChange={(event) => setAllowOrigins(event.target.value)}
                  placeholder="http://localhost:3000\nhttps://yourdomain.com"
                />
              </div>
              <Button type="submit" loading={savingSettings} className="w-full">
                Save settings
              </Button>
            </form>
          </Card>

          <Card header="Embed instructions">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Widget loader</p>
            <pre className="rounded-xl bg-slate-900 p-3 text-[11px] text-slate-100 shadow-inner">
              {`<script src="${primaryOrigin}/widget.js" async></script>`}
            </pre>
            <p className="text-xs text-slate-500">
              Place the snippet before <code>&lt;/body&gt;</code> on any domain listed above. Requests hit <code>/api/query</code> on this deployment.
            </p>
          </Card>
        </div>
      </div>

      <Card header="Recent ingestions">
        {logEntries.length === 0 ? (
          <p className="text-sm text-slate-500">No ingestions recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {logEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-100 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{entry.summary}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {entry.baseUrl && <div>Base: {entry.baseUrl}</div>}
                  {entry.pdfUrls && entry.pdfUrls.length > 0 && (
                    <div>PDFs: {entry.pdfUrls.join(", ")}</div>
                  )}
                  <div>Chunks stored: {entry.chunkCount}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
