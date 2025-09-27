import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AppSettings, Chunk } from "./types";

const dataDir = path.join(process.cwd(), "data");
const chunksFile = path.join(dataDir, "chunks.json");
const settingsFile = path.join(dataDir, "settings.json");
const ingestionLogFile = path.join(dataDir, "ingestion-log.json");

async function ensureDir() {
  await fs.mkdir(dataDir, { recursive: true });
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

const defaultSettings: AppSettings = {
  model: "gpt-4o-mini",
  maxTokens: 512,
  brandColor: "#2563EB",
  allowOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
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
