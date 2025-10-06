import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedTexts, cosineSimilarity } from "./embedding";
import { buildSnippet } from "./text";
import { getChunks, getSettings } from "./storage";
import type { Chunk, QueryResult } from "./types";

const MAX_SOURCE_COUNT = 5;
const MIN_RELEVANCE_SCORE = 0.18;
const SYSTEM_PROMPT =
  "You are a documentation assistant. Answer using only the provided sources and cite source numbers inline as [S1], [S2], etc.";

let geminiClient: GoogleGenerativeAI | null = null;

function getGemini(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

type RankedChunk = {
  chunk: Chunk;
  score: number;
};

function rankChunks(questionEmbedding: number[], chunks: Chunk[]): RankedChunk[] {
  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(chunk.embedding, questionEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCE_COUNT);
}

function filterRelevant(chunks: RankedChunk[]): RankedChunk[] {
  return chunks.filter(({ score }) => Number.isFinite(score) && score >= MIN_RELEVANCE_SCORE);
}

function formatFallbackAnswer(question: string, ranked: RankedChunk[]): string {
  if (ranked.length === 0) {
    return "I couldn’t find anything in the current knowledge base about that question.";
  }

  const bulletPoints = ranked.map(({ chunk }, index) => {
    const snippet = buildSnippet(chunk.content, 280);
    const title = chunk.title ? `${chunk.title}: ` : "";
    return `• ${title}${snippet} [S${index + 1}]`;
  });

  return `Here’s what I found related to “${question}”:\n\n${bulletPoints.join("\n\n")}`;
}

export async function runRagPipeline(question: string): Promise<QueryResult> {
  const chunks = await getChunks();
  if (chunks.length === 0) {
    return {
      answer: "No knowledge base has been ingested yet.",
      sources: [],
    };
  }

  const [questionEmbedding] = await embedTexts([question]);
  const ranked = rankChunks(questionEmbedding, chunks);
  const relevant = filterRelevant(ranked);

  if (relevant.length === 0) {
    return {
      answer: "I couldn’t find information about that. Try rephrasing your question or ingesting more relevant content.",
      sources: [],
    };
  }

  const settings = await getSettings();
  const sources = relevant.map(({ chunk, score }) => ({
    id: chunk.id,
    title: chunk.title,
    url: chunk.sourceUrl,
    snippet: buildSnippet(chunk.content),
    score,
  }));

  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  if (!hasGemini) {
    return {
      answer: formatFallbackAnswer(question, relevant),
      sources,
    };
  }

  const client = getGemini();
  if (!client) {
    return {
      answer: "LLM client could not be initialised.",
      sources,
    };
  }

  const context = relevant
    .map(({ chunk }, index) => `Source ${index + 1}: ${chunk.title}\n${chunk.content}`)
    .join("\n\n");

  try {
    const model = client.getGenerativeModel({
      model: settings.model,
      systemInstruction: {
        role: "system",
        parts: [{ text: SYSTEM_PROMPT }],
      },
    });
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Question: ${question}\n\nContext:\n${context}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: settings.maxTokens,
        temperature: 0.2,
      },
    });

    const text = response.response?.text() ?? "";
    return {
      answer: text || "The model did not return any output.",
      sources,
    };
  } catch (error) {
    console.error("LLM call failed", error);
    return {
      answer: formatFallbackAnswer(question, relevant),
      sources,
    };
  }
}
