import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedTexts, cosineSimilarity } from "./embedding";
import { buildSnippet, cleanText } from "./text";
import { getChunks, getSettings } from "./storage";
import type { QueryResult } from "./types";

const MAX_SOURCE_COUNT = 5;
const MAX_FALLBACK_SENTENCES_PER_SOURCE = 2;
const SYSTEM_PROMPT =
  "You are a documentation assistant. Answer using only the provided sources and cite source numbers inline as [S1], [S2], etc.";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "from",
  "your",
  "about",
  "into",
  "when",
  "have",
  "this",
  "will",
  "what",
  "does",
  "then",
  "been",
  "make",
  "sure",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function extractRelevantSentences(question: string, content: string): string[] {
  const normalizedContent = cleanText(content);
  if (!normalizedContent) {
    return [];
  }

  const sentences = normalizedContent.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!sentences.length) {
    return [];
  }

  const queryTerms = tokenize(question);
  const querySet = new Set(queryTerms);

  const scored = sentences
    .map((sentence) => {
      const sentenceTokens = tokenize(sentence);
      const overlap = sentenceTokens.reduce((total, token) => total + (querySet.has(token) ? 1 : 0), 0);
      return { sentence: sentence.trim(), overlap };
    })
    .filter((item) => item.overlap > 0);

  if (scored.length === 0) {
    return sentences.slice(0, MAX_FALLBACK_SENTENCES_PER_SOURCE).map((sentence) => sentence.trim());
  }

  return scored
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, MAX_FALLBACK_SENTENCES_PER_SOURCE)
    .map((item) => item.sentence);
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

export async function runRagPipeline(question: string): Promise<QueryResult> {
  const chunks = await getChunks();
  if (chunks.length === 0) {
    return {
      answer: "No knowledge base has been ingested yet.",
      sources: [],
    };
  }

  const [questionEmbedding] = await embedTexts([question]);
  const scored = chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(chunk.embedding, questionEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCE_COUNT);

  const settings = await getSettings();
  const sources = scored.map(({ chunk, score }) => ({
    id: chunk.id,
    title: chunk.title,
    url: chunk.sourceUrl,
    snippet: buildSnippet(chunk.content),
    score,
  }));

  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  if (!hasGemini) {
    if (scored.length === 0) {
      return {
        answer: "I could not find relevant information.",
        sources,
      };
    }

    const fallbackSections = scored
      .map(({ chunk }, index) => {
        const sentences = extractRelevantSentences(question, chunk.content);
        if (!sentences.length) {
          return null;
        }
        const passage = sentences.join(" ");
        return `• ${passage} [S${index + 1}]`;
      })
      .filter((section): section is string => Boolean(section));

    const fallbackAnswer = fallbackSections.length
      ? `Based on the stored knowledge, here are the most relevant details:\n\n${fallbackSections.join("\n\n")}`
      : `Based on the stored knowledge, here is what I found: ${buildSnippet(scored[0].chunk.content, 320)}`;

    return {
      answer: fallbackAnswer,
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

  const context = scored
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
    const fallbackAnswer = scored.length
      ? scored
          .map(({ chunk }, index) => `Source ${index + 1}: ${buildSnippet(chunk.content, 320)}`)
          .join("\n\n")
      : "I could not find relevant information.";

    return {
      answer: fallbackAnswer,
      sources,
    };
  }
}
