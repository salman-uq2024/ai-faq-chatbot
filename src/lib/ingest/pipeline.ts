import { randomUUID } from "crypto";
import { embedTexts } from "../embedding";
import { appendIngestionLog, replaceChunksForOrigin } from "../storage";
import type { Chunk, SourceIngestRequest } from "../types";
import { chunkText, estimateTokens } from "../text";
import { crawlSite } from "./crawl";
import { fetchPdf } from "./pdf";

type DocumentRecord = {
  url: string;
  title: string;
  text: string;
};

const DEFAULT_CHUNK_SIZE = 320;
const DEFAULT_CHUNK_OVERLAP = 60;
const EMBEDDING_BATCH_SIZE = 16;

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

async function embedInBatches(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const vectors = await embedTexts(batch);
    embeddings.push(...vectors);
  }
  return embeddings;
}

export async function ingestSources(request: SourceIngestRequest) {
  const documents: DocumentRecord[] = [];
  const {
    baseUrl,
    crawlDepth = 2,
    maxPages = 10,
    pdfUrls = [],
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = request;

  if (!baseUrl && pdfUrls.length === 0) {
    throw new Error("At least one of baseUrl or pdfUrls is required");
  }

  if (baseUrl) {
    const crawled = await crawlSite({
      baseUrl,
      maxPages,
      maxDepth: crawlDepth,
    });
    for (const page of crawled) {
      documents.push({ url: page.url, title: page.title, text: page.text });
    }
  }

  for (const pdfUrl of pdfUrls) {
    const pdfDocument = await fetchPdf(pdfUrl);
    if (pdfDocument) {
      documents.push({ url: pdfDocument.url, title: pdfDocument.title, text: pdfDocument.text });
    }
  }

  if (documents.length === 0) {
    throw new Error("No documents were ingested");
  }

  const chunkEntries: Chunk[] = [];

  for (const document of documents) {
    const chunks = chunkText(document.text, chunkSize, chunkOverlap);
    if (chunks.length === 0) {
      continue;
    }
    const vectors = await embedInBatches(chunks);
    chunks.forEach((content, index) => {
      const embedding = vectors[index];
      chunkEntries.push({
        id: randomUUID(),
        sourceUrl: document.url,
        title: document.title,
        content,
        embedding,
        tokens: estimateTokens(content),
        createdAt: new Date().toISOString(),
      });
    });
  }

  if (chunkEntries.length === 0) {
    throw new Error("Processed documents did not produce any chunks");
  }

  const chunksByOrigin = new Map<string, Chunk[]>();

  for (const chunk of chunkEntries) {
    const origin = getOrigin(chunk.sourceUrl);
    const grouped = chunksByOrigin.get(origin) ?? [];
    grouped.push(chunk);
    chunksByOrigin.set(origin, grouped);
  }

  for (const [origin, chunks] of chunksByOrigin) {
    await replaceChunksForOrigin(origin, chunks);
  }

  await appendIngestionLog({
    summary: `Ingested ${documents.length} documents and ${chunkEntries.length} chunks`,
    baseUrl,
    pdfUrls,
    chunkCount: chunkEntries.length,
  });

  return {
    documents: documents.length,
    chunks: chunkEntries.length,
  };
}
