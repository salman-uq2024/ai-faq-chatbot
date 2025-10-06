import { load } from "cheerio";

export function htmlToText(html: string): string {
  const $ = load(html);
  // Remove obvious non-content
  $("script, style, noscript").remove();
  $(
    [
      "header",
      "footer",
      "nav",
      "aside",
      "form",
      '[role="navigation"]',
      '[role="banner"]',
      '[role="search"]',
      '.skip-to-content',
      '.cookie',
      '.cookies',
    ].join(","),
  ).remove();

  // Prefer main/article content if available
  let root = $("main");
  if (!root.length) root = $("article");
  if (!root.length) root = $("[data-docs-root]");
  if (!root.length) root = $("body");

  // Extract text
  let text = root.text();
  // Remove some repeated UI phrases inline before normalization
  text = text
    .replace(/\b(Read\s+More|Subscribe|Contact\s+Sales)\b/gi, " ")
    .replace(/\bSearch\s+documentation\b/gi, " ")
    .replace(/\bShowcase\b|\bTemplates\b|\bDocs\b|\bBlog\b|\bEnterprise\b/gi, " ")
    .replace(/\s{2,}/g, " ");

  return cleanText(text);
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .replace(/[\t ]+/g, " ")
    .trim();
}

export function chunkText(
  text: string,
  chunkSize = 800,
  chunkOverlap = 120,
): string[] {
  const sanitized = cleanText(text);
  if (!sanitized) {
    return [];
  }

  const tokens = sanitized.split(/\s+/);
  if (tokens.length <= chunkSize) {
    return [sanitized];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < tokens.length) {
    const end = Math.min(tokens.length, start + chunkSize);
    const chunkTokens = tokens.slice(start, end);
    chunks.push(chunkTokens.join(" "));
    if (end === tokens.length) {
      break;
    }
    start = Math.max(end - chunkOverlap, start + 1);
  }

  return chunks;
}

export function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  return Math.max(1, Math.round(words.length * 1.3));
}

export function buildSnippet(text: string, limit = 220): string {
  const sanitized = cleanText(text);
  if (sanitized.length <= limit) {
    return sanitized;
  }
  return `${sanitized.slice(0, limit)}…`;
}
