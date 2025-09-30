import { createHash } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

const FALLBACK_EMBEDDING_DIMENSION = 768;

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  return geminiClient;
}

async function embedWithGemini(texts: string[], client: GoogleGenerativeAI): Promise<number[][] | null> {
  try {
    const modelName = process.env.GEMINI_EMBEDDING_MODEL ?? "models/embedding-001";
    const model = client.getGenerativeModel({ model: modelName });
    const response = await model.batchEmbedContents({
      requests: texts.map((text) => ({
        content: {
          role: "user",
          parts: [{ text }],
        },
      })),
    });
    const embeddings = response.embeddings ?? [];
    if (!embeddings?.length) {
      return null;
    }
    return embeddings.map((item) => item.values);
  } catch (error) {
    console.error("Embedding request failed, using fallback", error);
    return null;
  }
}

function hashWord(word: string): number {
  const hash = createHash("sha1").update(word).digest();
  return hash.readUInt32BE(0);
}

function fallbackEmbedding(text: string): number[] {
  const vector = new Array<number>(FALLBACK_EMBEDDING_DIMENSION).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    const index = hashWord(word) % FALLBACK_EMBEDDING_DIMENSION;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return vector;
  }
  return vector.map((value) => value / magnitude);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getGeminiClient();

  if (client) {
    const embeddings = await embedWithGemini(texts, client);
    if (embeddings) {
      return embeddings;
    }
  }

  return texts.map((text) => fallbackEmbedding(text));
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
