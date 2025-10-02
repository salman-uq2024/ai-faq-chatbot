import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("AI FAQ Chatbot", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/AI assistant/i);
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

test("demo page renders", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Demo the AI FAQ Chatbot");
});