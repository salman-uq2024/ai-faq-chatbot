import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AppSettings, Chunk } from "./types";

function resolvePrimaryStorageDir(): string {
  const override = process.env.STORAGE_DIR;
  if (override) {
    return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
  }

  const isServerless = process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_VERSION);
  if (isServerless) {
    return "/tmp/ai-faq-chatbot";
  }

  return path.join(process.cwd(), "data");
}

let dataDir = resolvePrimaryStorageDir();
let chunksFile = path.join(dataDir, "chunks.json");
let settingsFile = path.join(dataDir, "settings.json");
let ingestionLogFile = path.join(dataDir, "ingestion-log.json");

async function switchToDir(dir: string) {
  dataDir = dir;
  chunksFile = path.join(dataDir, "chunks.json");
  settingsFile = path.join(dataDir, "settings.json");
  ingestionLogFile = path.join(dataDir, "ingestion-log.json");
  await fs.mkdir(dataDir, { recursive: true });
}

async function ensureDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      if (dataDir !== "/tmp/ai-faq-chatbot") {
        await switchToDir("/tmp/ai-faq-chatbot");
        return;
      }
    }
    throw error;
  }
}

class Mutex {
  private queue = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }
}

const mutex = new Mutex();

async function ensureFile<T>(filePath: string, defaultValue: T) {
  await ensureDir();
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), "utf-8");
  }
}

type ChunkStoreShape = {
  version: number;
  chunks: Chunk[];
};

type SettingsShape = {
  version: number;
  settings: AppSettings;
};

type IngestionLogEntry = {
  id: string;
  createdAt: string;
  summary: string;
  baseUrl?: string;
  pdfUrls?: string[];
  chunkCount: number;
};

type IngestionLogShape = {
  version: number;
  entries: IngestionLogEntry[];
};

export type KnowledgeBaseStats = {
  chunkCount: number;
  sourceCount: number;
  totalTokens: number;
  lastIngestedAt: string | null;
  topSources: Array<{
    url: string;
    title: string;
    chunkCount: number;
  }>;
};

const defaultSettings: AppSettings = {
  model: "models/gemini-2.0-flash",
  maxTokens: 512,
  brandColor: "#2563EB",
  allowOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
  ],
};

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export async function getChunks(): Promise<Chunk[]> {
  return mutex.runExclusive(async () => {
    await ensureFile<ChunkStoreShape>(chunksFile, { version: 1, chunks: [] });
    const data = await readJsonFile<ChunkStoreShape>(chunksFile);
    return data.chunks;
  });
}

export async function replaceChunksForOrigin(origin: string, chunks: Chunk[]) {
  await mutex.runExclusive(async () => {
    await ensureFile<ChunkStoreShape>(chunksFile, { version: 1, chunks: [] });
    const data = await readJsonFile<ChunkStoreShape>(chunksFile);
    const filtered = data.chunks.filter((chunk) => !chunk.sourceUrl.startsWith(origin));
    const updated: ChunkStoreShape = {
      version: 1,
      chunks: [...filtered, ...chunks],
    };
    await writeJsonFile(chunksFile, updated);
  });
}

export async function replaceChunksForSources(sourceUrls: string[], incomingChunks: Chunk[]) {
  const normalizedSources = new Set(sourceUrls.map((url) => url.trim()).filter(Boolean));
  await mutex.runExclusive(async () => {
    await ensureFile<ChunkStoreShape>(chunksFile, { version: 1, chunks: [] });
    const data = await readJsonFile<ChunkStoreShape>(chunksFile);
    const preserved = data.chunks.filter((chunk) => !normalizedSources.has(chunk.sourceUrl));
    const updated: ChunkStoreShape = {
      version: 1,
      chunks: [...preserved, ...incomingChunks],
    };
    await writeJsonFile(chunksFile, updated);
  });
}

export async function addChunks(chunks: Chunk[]) {
  await mutex.runExclusive(async () => {
    await ensureFile<ChunkStoreShape>(chunksFile, { version: 1, chunks: [] });
    const data = await readJsonFile<ChunkStoreShape>(chunksFile);
    const updated: ChunkStoreShape = {
      version: 1,
      chunks: [...data.chunks, ...chunks],
    };
    await writeJsonFile(chunksFile, updated);
  });
}

export async function clearChunks() {
  await mutex.runExclusive(async () => {
    await ensureDir();
    await writeJsonFile(chunksFile, { version: 1, chunks: [] as Chunk[] });
  });
}

export async function getSettings(): Promise<AppSettings> {
  return mutex.runExclusive(async () => {
    await ensureFile<SettingsShape>(settingsFile, { version: 1, settings: defaultSettings });
    const data = await readJsonFile<SettingsShape>(settingsFile);
    return data.settings;
  });
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  return mutex.runExclusive(async () => {
    await ensureFile<SettingsShape>(settingsFile, { version: 1, settings: defaultSettings });
    const data = await readJsonFile<SettingsShape>(settingsFile);
    const merged: AppSettings = { ...data.settings, ...partial };
    await writeJsonFile(settingsFile, { version: 1, settings: merged });
    return merged;
  });
}

export async function appendIngestionLog(entry: Omit<IngestionLogEntry, "id" | "createdAt">) {
  await mutex.runExclusive(async () => {
    await ensureFile<IngestionLogShape>(ingestionLogFile, { version: 1, entries: [] });
    const data = await readJsonFile<IngestionLogShape>(ingestionLogFile);
    const logEntry: IngestionLogEntry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry,
    };
    const updated: IngestionLogShape = {
      version: 1,
      entries: [logEntry, ...data.entries].slice(0, 25),
    };
    await writeJsonFile(ingestionLogFile, updated);
  });
}

export async function getIngestionLog(): Promise<IngestionLogEntry[]> {
  return mutex.runExclusive(async () => {
    await ensureFile<IngestionLogShape>(ingestionLogFile, { version: 1, entries: [] });
    const data = await readJsonFile<IngestionLogShape>(ingestionLogFile);
    return data.entries;
  });
}

export async function clearIngestionLog() {
  await mutex.runExclusive(async () => {
    await ensureDir();
    await writeJsonFile(ingestionLogFile, { version: 1, entries: [] as IngestionLogEntry[] });
  });
}

export async function getKnowledgeBaseStats(): Promise<KnowledgeBaseStats> {
  return mutex.runExclusive(async () => {
    await ensureFile<ChunkStoreShape>(chunksFile, { version: 1, chunks: [] });
    await ensureFile<IngestionLogShape>(ingestionLogFile, { version: 1, entries: [] });

    const chunkData = await readJsonFile<ChunkStoreShape>(chunksFile);
    const logData = await readJsonFile<IngestionLogShape>(ingestionLogFile);

    const sourceMap = new Map<string, { title: string; chunkCount: number }>();
    let totalTokens = 0;
    for (const chunk of chunkData.chunks) {
      totalTokens += chunk.tokens;
      const existing = sourceMap.get(chunk.sourceUrl);
      if (existing) {
        existing.chunkCount += 1;
      } else {
        sourceMap.set(chunk.sourceUrl, { title: chunk.title, chunkCount: 1 });
      }
    }

    const topSources = [...sourceMap.entries()]
      .map(([url, value]) => ({
        url,
        title: value.title,
        chunkCount: value.chunkCount,
      }))
      .sort((a, b) => b.chunkCount - a.chunkCount)
      .slice(0, 5);

    return {
      chunkCount: chunkData.chunks.length,
      sourceCount: sourceMap.size,
      totalTokens,
      lastIngestedAt: logData.entries[0]?.createdAt ?? null,
      topSources,
    };
  });
}
