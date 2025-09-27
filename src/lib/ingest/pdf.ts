import pdfParse from "pdf-parse/lib/pdf-parse";
import { cleanText } from "../text";

export type PdfDocument = {
  url: string;
  title: string;
  text: string;
};

export async function fetchPdf(url: string): Promise<PdfDocument | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AI-FAQ-Chatbot-Crawler/1.0",
        Accept: "application/pdf",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF ${url}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdfParse(buffer);
    const title = extractTitle(parsed.info, url);
    const text = cleanText(parsed.text ?? "");
    if (!text) {
      return null;
    }

    return {
      url,
      title,
      text,
    };
  } catch (error) {
    console.error(`Failed to fetch PDF ${url}`, error);
    return null;
  }
}

function extractTitle(info: Record<string, unknown> | undefined, fallback: string): string {
  const title =
    info && typeof (info as { Title?: unknown }).Title === "string"
      ? String((info as { Title: string }).Title)
      : null;
  if (title) {
    return title;
  }
  try {
    const url = new URL(fallback);
    return url.pathname.split("/").filter(Boolean).pop() ?? fallback;
  } catch {
    return fallback;
  }
}
