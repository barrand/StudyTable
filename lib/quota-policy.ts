export class LimitError extends Error {}
export function limitValue(value: string | undefined, fallback: number) {
  const n = Number(value ?? fallback);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}
export function quotaDecision(
  local: number,
  global: number,
  localLimit: number,
  globalLimit: number,
) {
  if (local >= localLimit || global >= globalLimit)
    throw new LimitError(
      "The daily study allowance has been reached. Please return tomorrow.",
    );
  return {
    local: local + 1,
    global: global + 1,
    remaining: Math.min(localLimit - local - 1, globalLimit - global - 1),
  };
}
