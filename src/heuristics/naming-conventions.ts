// ============================================
// Sawrin - Naming Conventions Heuristic
// ============================================
// Match source files to test files via naming patterns

import { basename, dirname, join } from "path";

/**
 * Common test file patterns
 */
const TEST_PATTERNS = [
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
export function isTestFile(filePath: string): boolean {
  const name = basename(filePath);
  return (
    TEST_PATTERNS.some((p) => name.endsWith(p.suffix)) ||
    filePath.includes("__tests__/") ||
    filePath.includes("/test/") ||
    filePath.includes("/tests/")
  );
}

/**
 * Get potential test file paths for a source file
 */
export function getTestFilePatterns(sourceFile: string): string[] {
  const patterns: string[] = [];
  const dir = dirname(sourceFile);
  const name = basename(sourceFile);

  // Skip if already a test file
  if (isTestFile(sourceFile)) {
    return [];
  }

  // Find matching extension patterns
  for (const pattern of TEST_PATTERNS) {
    if (name.endsWith(pattern.sourceSuffix)) {
      const baseName = name.slice(0, -pattern.sourceSuffix.length);
      const testName = baseName + pattern.suffix;

      // Same directory
      patterns.push(join(dir, testName));

      // __tests__ subdirectory
      patterns.push(join(dir, "__tests__", testName));

      // test/ subdirectory
      patterns.push(join(dir, "test", testName));

      // tests/ subdirectory
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

  for (const pattern of TEST_PATTERNS) {
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
): string[] {
  const patterns = getTestFilePatterns(sourceFile);
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
  const sourceBaseName = basename(sourceFile).replace(/\.(ts|tsx|js|jsx)$/, "");
  for (const file of allFiles) {
    if (isTestFile(file)) {
      const testBaseName = basename(file).replace(
        /\.(spec|test)\.(ts|tsx|js|jsx)$/,
        "",
      );
      if (testBaseName === sourceBaseName && !matches.includes(file)) {
        matches.push(file);
      }
    }
  }

  return matches;
}
