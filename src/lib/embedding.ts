import { createHash } from "crypto";
import OpenAI from "openai";

const EMBEDDING_DIMENSION = 256;

let openAIClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openAIClient;
}

function hashWord(word: string): number {
  const hash = createHash("sha1").update(word).digest();
  return hash.readUInt32BE(0);
}

function fallbackEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    const index = hashWord(word) % EMBEDDING_DIMENSION;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return vector;
  }
  return vector.map((value) => value / magnitude);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();

  if (!client) {
    return texts.map((text) => fallbackEmbedding(text));
  }

  try {
    const response = await client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error("Embedding request failed, using fallback", error);
    return texts.map((text) => fallbackEmbedding(text));
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < length; i += 1) {
    const aValue = a[i];
    const bValue = b[i];
    dot += aValue * bValue;
    aMag += aValue * aValue;
    bMag += bValue * bValue;
  }
  if (aMag === 0 || bMag === 0) {
    return 0;
  }
  return dot / Math.sqrt(aMag * bMag);
}
