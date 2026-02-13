import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI FAQ Chatbot");
  await expect(page.getByRole("link", { name: "AI FAQ Chatbot" })).toBeVisible();
});

test("API responds with answer payload", async ({ request }) => {
  const response = await request.post("/api/query", {
    data: { question: "What is this project?" },
  });
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(typeof json.answer).toBe("string");
  expect(Array.isArray(json.sources)).toBe(true);
});

test("widget loader is served", async ({ request }) => {
  const response = await request.get("/widget.js");
  expect(response.ok()).toBeTruthy();
  const text = await response.text();
  expect(text).toContain("__aiFaqWidgetLoaded");
});

test("query endpoint supports CORS preflight", async ({ request }) => {
  const response = await request.fetch("/api/query", {
    method: "OPTIONS",
    headers: {
      Origin: "http://127.0.0.1:3100",
      "Access-Control-Request-Method": "POST",
    },
  });
  expect(response.status()).toBe(204);
  expect(response.headers()["access-control-allow-origin"]).toBe("http://127.0.0.1:3100");
});

test("admin stats endpoint responds", async ({ request }) => {
  const response = await request.get("/api/admin/stats");
  expect([200, 401]).toContain(response.status());
  const json = await response.json();
  if (response.status() === 401) {
    expect(typeof json.error).toBe("string");
    return;
  }
  expect(typeof json.chunkCount).toBe("number");
  expect(typeof json.sourceCount).toBe("number");
  expect(typeof json.totalTokens).toBe("number");
  expect(Array.isArray(json.topSources)).toBe(true);
});

test("demo page renders", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Demo the AI FAQ Chatbot");
});
