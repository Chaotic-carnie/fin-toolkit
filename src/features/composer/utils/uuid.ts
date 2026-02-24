// src/features/composer/utils/uuid.ts

/**
 * Browser-safe UUID helper.
 * Uses crypto.randomUUID when available, otherwise falls back to a small random id.
 */
export function uid(prefix = "leg"): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${(crypto as any).randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(2, 6)}`;
}
