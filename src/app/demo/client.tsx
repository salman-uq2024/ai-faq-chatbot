"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { QueryResult } from "@/lib/types";

export function DemoClient() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        throw new Error("Query failed");
      }
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Ask a question about the AI FAQ Chatbot (e.g., What is RAG?)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full"
        />
        <Button type="submit" disabled={loading || !question.trim()} className="w-full">
          {loading ? "Querying..." : "Submit Query"}
        </Button>
      </form>

      {error && (
        <Alert variant="error">
          <div>{error}</div>
        </Alert>
      )}

      {response && (
        <Card header="Response">
          <div className="space-y-4">
            <p className="whitespace-pre-wrap">{response.answer}</p>
            {response.sources.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Sources:</h4>
                <ul className="space-y-1 text-sm">
                  {response.sources.map((source, index) => (
                    <li key={source.id} className="text-slate-600">
                      [{index + 1}] {source.title} - {source.snippet}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}