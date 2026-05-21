import "server-only";

import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  openaiClient ??= new OpenAI({ apiKey });
  return openaiClient;
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5-mini";
}
