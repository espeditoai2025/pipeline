"use server";

import { mockAIReply, getAIInsights, generateEmailDraft } from "@/lib/mock-ai";
import type { AIInsight, AIEmailDraft } from "@/types/ai";

type ActionResult<T> = { data?: T; error?: string };

export async function askAssistant(message: string): Promise<ActionResult<string>> {
  if (!message.trim()) return { error: "Messaggio vuoto" };
  // Simulate network latency (200–700ms)
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 500));
  const reply = mockAIReply(message);
  return { data: reply };
}

export async function fetchAIInsights(): Promise<ActionResult<AIInsight[]>> {
  await new Promise((r) => setTimeout(r, 300));
  return { data: getAIInsights() };
}

export async function generateEmail(
  prompt: string,
  context?: { contactName?: string; dealTitle?: string }
): Promise<ActionResult<AIEmailDraft>> {
  if (!prompt.trim()) return { error: "Prompt vuoto" };
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
  return { data: generateEmailDraft(prompt, context) };
}
