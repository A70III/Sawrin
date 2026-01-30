// ============================================
// Sawrin - Naming Conventions Heuristic
// ============================================
// Match source files to test files via naming patterns

import { basename, dirname, join } from "path";
import type { SawrinConfig } from "../types/index.js";
import { shouldIgnoreFile } from "../core/config.js";

/**
 * Common test file patterns
 */
const DEFAULT_TEST_PATTERNS = [
  // .spec.ts pattern
  { suffix: ".spec.ts", sourceSuffix: ".ts" },
  { suffix: ".spec.tsx", sourceSuffix: ".tsx" },
  { suffix: ".spec.js", sourceSuffix: ".js" },
  { suffix: ".spec.jsx", sourceSuffix: ".jsx" },
  // .test.ts pattern
  { suffix: ".test.ts", sourceSuffix: ".ts" },
  { suffix: ".test.tsx", sourceSuffix: ".tsx" },
  { suffix: ".test.js", sourceSuffix: ".js" },
  { suffix: ".test.jsx", sourceSuffix: ".jsx" },
];

/**
 * Check if a file is a test file
 */
export function isTestFile(filePath: string, config?: SawrinConfig): boolean {
  // If config has test patterns, use them
  if (config && config.testPatterns && config.testPatterns.length > 0) {
    // Simple verification check using the config helper if available or manual glob match
    // For now we'll assume the caller might want to reuse the logic from config.ts
    // but to avoid circular imports if config.ts imports this, we should be careful.
    // Ideally we use a shared glob matcher or the one in config.ts.
    // Importing matchGlobPattern from config.ts is safe if config.ts doesn't import this file.
    // Let's check config.ts... it seems config.ts doesn't import naming-conventions.

    // We can also implement a simple check here or reuse logic.
    // Let's allow passing a utility or just iterate manually if needed.
    // For simplicity and correctness, let's use the simple suffix check as default
    // BUT if config is present, we should trust config.testPatterns.

    // Since we don't want to duplicate glob logic, and config.ts has isConfiguredTestFile,
    // maybe we should move that logic or call it?
    // Actually, `isConfiguredTestFile` in config.ts is perfect.
    // But to avoid circular deps (if any), let's see.
    // naming-conventions imported by risk-calculator, etc.
    // config.ts imported by index.ts, risk-calculator, etc.
    // It should be fine to import { isConfiguredTestFile } from "../core/config.js" if config.ts doesn't import this.
    // Let's assume it's safe.

    // Actually, let's just do a basic check here or accept that the caller might handle it.
    // But the request is to "Update isTestFile... to use config".

    // REVISIT: simpler approach - use the config patterns if provided
    return matchesAnyPattern(filePath, config.testPatterns);
  }

  const name = basename(filePath);
  return (
    DEFAULT_TEST_PATTERNS.some((p) => name.endsWith(p.suffix)) ||
    filePath.includes("__tests__/") ||
    filePath.includes("/test/") ||
    filePath.includes("/tests/")
  );
}

/**
 * Helper for glob-like matching (simplified for suffixes/wildcards)
 */
import { matchGlobPattern } from "../shared/glob.js";

/**
 * Helper for glob-like matching (simplified for suffixes/wildcards)
 */
function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchGlobPattern(filePath, pattern));
}

/**
 * Get potential test file paths for a source file
 */
export function getTestFilePatterns(
  sourceFile: string,
  config?: SawrinConfig,
): string[] {
  const patterns: string[] = [];
  const dir = dirname(sourceFile);
  const name = basename(sourceFile);

  // Skip if already a test file
  if (isTestFile(sourceFile, config)) {
    return [];
  }

  // Find matching extension patterns
  for (const pattern of DEFAULT_TEST_PATTERNS) {
    if (name.endsWith(pattern.sourceSuffix)) {
      const baseName = name.slice(0, -pattern.sourceSuffix.length);
      const testName = baseName + pattern.suffix;

      // Same directory
      patterns.push(join(dir, testName));

      // __tests__ subdirectory
      patterns.push(join(dir, "__tests__", testName));

      // test/ and tests/ subdirectories
      patterns.push(join(dir, "test", testName));
      patterns.push(join(dir, "tests", testName));

      // Parallel tests directory (src/x.ts -> tests/x.spec.ts)
      if (dir.includes("src/") || dir.includes("src\\")) {
        const testsDir = dir.replace(/\bsrc\b/, "tests");
        patterns.push(join(testsDir, testName));
        const testDir = dir.replace(/\bsrc\b/, "test");
        patterns.push(join(testDir, testName));
      }
    }
  }

  return patterns.map((p) => p.replace(/\\/g, "/"));
}

/**
 * Get the source file for a test file
 */
export function getSourceFileFromTest(testFile: string): string | null {
  const name = basename(testFile);
  const dir = dirname(testFile);

  for (const pattern of DEFAULT_TEST_PATTERNS) {
    if (name.endsWith(pattern.suffix)) {
      const baseName = name.slice(0, -pattern.suffix.length);
      const sourceName = baseName + pattern.sourceSuffix;

      // Check if in __tests__ directory
      if (
        dir.endsWith("__tests__") ||
        dir.endsWith("test") ||
        dir.endsWith("tests")
      ) {
        const parentDir = dirname(dir);
        return join(parentDir, sourceName).replace(/\\/g, "/");
      }

      // Same directory
      return join(dir, sourceName).replace(/\\/g, "/");
    }
  }

  return null;
}

/**
 * Match a source file to existing test files
 */
export function matchTestFiles(
  sourceFile: string,
  allFiles: string[],
  config?: SawrinConfig,
): string[] {
  const patterns = getTestFilePatterns(sourceFile, config);
  const matches: string[] = [];

  // Normalize paths for comparison
  const normalizedPatterns = patterns.map((p) =>
    p.toLowerCase().replace(/\\/g, "/"),
  );

  for (const file of allFiles) {
    const normalized = file.toLowerCase().replace(/\\/g, "/");
    if (normalizedPatterns.includes(normalized)) {
      matches.push(file);
    }
  }

  // Also try fuzzy matching by base name
  // Optimized: Only if not matched yet
  const sourceBaseName = basename(sourceFile).replace(/\.(ts|tsx|js|jsx)$/, "");

  for (const file of allFiles) {
    // Start with strictly checking if it IS a test file
    if (isTestFile(file, config)) {
      // If we found strict matches, maybe we don't need fuzzy?
      // But keeping legacy behavior for now.

      const testBaseName = basename(file).replace(
        /\.(spec|test)\.(ts|tsx|js|jsx)$/,
        "",
      );
      // Clean up base name if it has suffix

      if (testBaseName === sourceBaseName && !matches.includes(file)) {
        matches.push(file);
      }
    }
  }

  return matches;
}
