import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedTexts, cosineSimilarity } from "./embedding";
import { buildSnippet, cleanText } from "./text";
import { getChunks, getSettings } from "./storage";
import type { Chunk, QueryResult } from "./types";

const MAX_SOURCE_COUNT = 5;
const MIN_RELEVANCE_SCORE = 0.18;
const MAX_BULLETS = 3;
const SYSTEM_PROMPT =
  "You are a documentation assistant. Answer using only the provided sources and cite source numbers inline as [S1], [S2], etc.";
const GREETING_PATTERNS = [/^\s*hi\b/i, /^\s*hello\b/i, /^\s*hey\b/i, /^\s*good\s+(morning|afternoon|evening)\b/i];

function isGreeting(question: string): boolean {
  return GREETING_PATTERNS.some((pattern) => pattern.test(question));
}

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

function dedupeBySource(chunks: RankedChunk[]): RankedChunk[] {
  const seen = new Set<string>();
  const deduped: RankedChunk[] = [];
  for (const entry of chunks) {
    if (seen.has(entry.chunk.sourceUrl)) {
      continue;
    }
    seen.add(entry.chunk.sourceUrl);
    deduped.push(entry);
    if (deduped.length >= MAX_SOURCE_COUNT) {
      break;
    }
  }
  return deduped;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function selectRelevantSentences(question: string, content: string, limit = 2): string[] {
  const sanitized = cleanText(content);
  if (!sanitized) {
    return [];
  }

  const sentences = sanitized.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) {
    return [];
  }

  const queryTokens = new Set(tokenize(question));
  if (queryTokens.size === 0) {
    return sentences.slice(0, limit).map((sentence) => sentence.trim());
  }

  const scored = sentences
    .map((sentence) => {
      const sentenceTokens = tokenize(sentence);
      const overlap = sentenceTokens.reduce(
        (total, token) => (queryTokens.has(token) ? total + 1 : total),
        0,
      );
      return { sentence: sentence.trim(), overlap };
    })
    .filter((item) => item.overlap > 0);

  if (scored.length === 0) {
    return sentences.slice(0, limit).map((sentence) => sentence.trim());
  }

  return scored
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((item) => item.sentence);
}

function formatFallbackAnswer(question: string, ranked: RankedChunk[]): string {
  if (ranked.length === 0) {
    return "I couldn’t find anything in the current knowledge base about that question.";
  }

  const limit = Math.min(ranked.length, MAX_BULLETS);
  const bulletPoints = ranked.slice(0, limit).map(({ chunk }, index) => {
    const summarySentences = selectRelevantSentences(question, chunk.content, 2);
    const summary = summarySentences.length > 0 ? summarySentences.join(" ") : buildSnippet(chunk.content, 220);
    const title = chunk.title ? `${chunk.title} — ` : "";
    return `• ${title}${summary} [S${index + 1}]`;
  });

  return `Here’s what I found related to “${question}”:\n\n${bulletPoints.join("\n\n")}`;
}

export async function runRagPipeline(question: string): Promise<QueryResult> {
  if (isGreeting(question)) {
    return {
      answer: "Hi there! Ask me about the topics we’ve ingested, or let me know what you’d like to learn.",
      sources: [],
    };
  }

  const chunks = await getChunks();
  if (chunks.length === 0) {
    return {
      answer: "No knowledge base has been ingested yet.",
      sources: [],
    };
  }

  const [questionEmbedding] = await embedTexts([question]);
  const ranked = rankChunks(questionEmbedding, chunks);
  const filtered = filterRelevant(ranked);
  const relevant = dedupeBySource(filtered);

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
