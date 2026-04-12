/**
 * AI Generation Log — records every LLM call for observability.
 *
 * Fire-and-forget: callers should .catch(() => {}) to avoid blocking
 * the main flow. The log is for analytics, not for control flow.
 */

import { getSupabase } from '../db';

export interface AiLogEntry {
  client_id?: string;
  agent: string;             // 'growth_agent', 'growth_agent_qa', 'advisor_chat', 'geo_probe', 'sector', 'content', 'conversion', 'competitors'
  model: string;             // 'claude-sonnet-4-6', etc.
  layer?: number;            // 1=primary, 2=retry, 3=micro_fallback, 4=template
  success: boolean;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  cost_cents?: number;
  latency_ms?: number;
  qa_corrections?: number;
  structural_errors?: string[];
  stop_reason?: string;
  error_message?: string;
}

/**
 * Log an AI generation call. Fire-and-forget — never throws.
 */
export async function logAiGeneration(entry: AiLogEntry): Promise<void> {
  try {
    const sb = getSupabase();
    await sb.from('ai_generation_log').insert(entry);
  } catch (err) {
    // Truly silent — this is observability, not control flow
    console.error('[ai-log] Write failed:', (err as Error).message);
  }
}

/**
 * Estimate cost in USD cents based on model + tokens.
 * Prices as of April 2026 (Anthropic public pricing).
 */
export function estimateAiCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
): number {
  // Prices per 1M tokens (USD)
  const prices: Record<string, { input: number; output: number }> = {
    'claude-opus-4-6':   { input: 5.00, output: 25.00 },
    'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
    'claude-haiku-4-5':  { input: 1.00, output: 5.00 },
    'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },
    'gpt-4o-mini':       { input: 0.15, output: 0.60 },
    'gemini-2.0-flash':  { input: 0.10, output: 0.40 },
    'sonar':             { input: 1.00, output: 1.00 },
    'deepseek-chat':     { input: 0.27, output: 1.10 },
  };

  const p = prices[model] || { input: 3.00, output: 15.00 }; // default to Sonnet pricing

  // Cache reads cost 10% of input price, cache writes cost 125%
  const uncachedInput = inputTokens - cacheReadTokens - cacheWriteTokens;
  const costUsd =
    (Math.max(0, uncachedInput) / 1_000_000) * p.input +
    (cacheReadTokens / 1_000_000) * (p.input * 0.1) +
    (cacheWriteTokens / 1_000_000) * (p.input * 1.25) +
    (outputTokens / 1_000_000) * p.output;

  return Math.ceil(costUsd * 100); // cents
}
