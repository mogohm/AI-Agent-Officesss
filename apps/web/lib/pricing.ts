// Pure cost calculation from token usage + per-1k pricing. Pricing is stored
// with effective dates in ProviderModel; estimates are never treated as final.
export type CostBreakdown = { inputCost: number; outputCost: number; totalCost: number };

export function computeCost(
  promptTokens: number,
  completionTokens: number,
  inputPer1k: number,
  outputPer1k: number,
): CostBreakdown {
  const inputCost = round6((promptTokens / 1000) * inputPer1k);
  const outputCost = round6((completionTokens / 1000) * outputPer1k);
  return { inputCost, outputCost, totalCost: round6(inputCost + outputCost) };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
