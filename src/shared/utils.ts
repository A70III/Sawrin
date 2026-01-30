// ============================================
// Sawrin - Shared Utilities
// ============================================
// Common utility functions used across modules

import type { ImpactReason } from "../types/index.js";

/**
 * Default risk thresholds
 */
export const DefaultRiskThresholds = {
  LOW: 3,
  MEDIUM: 7,
};

/**
 * Add an impact reason to the map, avoiding duplicates
 */
export function addImpact(
  map: Map<string, ImpactReason[]>,
  file: string,
  reason: ImpactReason,
): void {
  if (!map.has(file)) {
    map.set(file, []);
  }

  const reasons = map.get(file)!;

  // Avoid duplicate reasons
  const isDuplicate = reasons.some(
    (r) =>
      r.type === reason.type &&
      r.description === reason.description &&
      r.relatedFile === reason.relatedFile,
  );

  if (!isDuplicate) {
    reasons.push(reason);
  }
}

/**
 * Get directory name from path (cross-platform)
 */
export function getDirname(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  parts.pop();
  return parts.join("/");
}

/**
 * Normalize path to use forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}
