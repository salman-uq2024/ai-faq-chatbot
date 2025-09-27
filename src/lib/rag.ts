import OpenAI from "openai";
import { embedTexts, cosineSimilarity } from "./embedding";
import { buildSnippet } from "./text";
import { getChunks, getSettings } from "./storage";
import type { QueryResult } from "./types";

const MAX_SOURCE_COUNT = 5;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);

  if (!hasOpenAi) {
    const fallbackAnswer = scored.length
      ? `Based on the available knowledge, here is what I found: ${scored
          .map(({ chunk }) => buildSnippet(chunk.content, 320))
          .join("\n\n")}`
      : "I could not find relevant information.";

    return {
      answer: fallbackAnswer,
      sources,
    };
  }

  const client = getOpenAI();
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
    const response = await client.responses.create({
      model: settings.model,
      input: [
        {
          role: "system",
          content:
            "You are a documentation assistant. Answer using only the provided sources and cite source numbers inline as [S1], [S2], etc.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nContext:\n${context}`,
        },
      ],
      max_output_tokens: settings.maxTokens,
      temperature: 0.2,
    });

    const text = response.output_text ?? "";
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
