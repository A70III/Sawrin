// ============================================
// Sawrin - Folder Conventions Heuristic
// ============================================
// Detect module boundaries and risk levels from folder structure

import { dirname, basename } from "path";

/**
 * High-risk folder patterns that indicate critical code
 */
const HIGH_RISK_FOLDERS = [
  "auth",
  "authentication",
  "security",
  "core",
  "database",
  "db",
  "config",
  "migrations",
];

/**
 * Medium-risk folder patterns
 */
const MEDIUM_RISK_FOLDERS = [
  "services",
  "service",
  "controllers",
  "controller",
  "middleware",
  "middlewares",
  "api",
  "routes",
  "handlers",
];

/**
 * Low-risk folder patterns
 */
const LOW_RISK_FOLDERS = [
  "utils",
  "helpers",
  "lib",
  "common",
  "shared",
  "types",
  "interfaces",
  "constants",
];

/**
 * Folder patterns likely to contain tests
 */
const TEST_FOLDER_PATTERNS = ["__tests__", "test", "tests", "spec", "specs"];

/**
 * Get the module name from a file path
 */
export function getModuleName(filePath: string): string {
  const dir = dirname(filePath);
  const parts = dir.split(/[/\\]/).filter(Boolean);

  // Skip common root directories
  const skipDirs = ["src", "lib", "app", "packages"];
  const relevantParts = parts.filter((p) => !skipDirs.includes(p));

  if (relevantParts.length > 0) {
    return relevantParts[0];
  }

  return parts[parts.length - 1] || "root";
}

/**
 * Check if two files are in the same module
 */
export function areInSameModule(file1: string, file2: string): boolean {
  return getModuleName(file1) === getModuleName(file2);
}

/**
 * Get the folder risk level for a file
 */
export function getFolderRiskLevel(
  filePath: string,
): "high" | "medium" | "low" | "none" {
  const lowerPath = filePath.toLowerCase();
  const dir = dirname(lowerPath);
  const folderName = basename(dir);

  // Check high-risk patterns
  if (
    HIGH_RISK_FOLDERS.some(
      (f) =>
        lowerPath.includes(`/${f}/`) ||
        lowerPath.includes(`\\${f}\\`) ||
        folderName === f,
    )
  ) {
    return "high";
  }

  // Check medium-risk patterns
  if (
    MEDIUM_RISK_FOLDERS.some(
      (f) =>
        lowerPath.includes(`/${f}/`) ||
        lowerPath.includes(`\\${f}\\`) ||
        folderName === f,
    )
  ) {
    return "medium";
  }

  // Check low-risk patterns
  if (
    LOW_RISK_FOLDERS.some(
      (f) =>
        lowerPath.includes(`/${f}/`) ||
        lowerPath.includes(`\\${f}\\`) ||
        folderName === f,
    )
  ) {
    return "low";
  }

  return "none";
}

/**
 * Check if a file is in a test folder
 */
export function isInTestFolder(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return TEST_FOLDER_PATTERNS.some(
    (p) => lowerPath.includes(`/${p}/`) || lowerPath.includes(`\\${p}\\`),
  );
}

/**
 * Get co-located files in the same directory
 */
export function getColocatedTestFiles(
  sourceFile: string,
  allFiles: string[],
): string[] {
  const sourceDir = dirname(sourceFile);
  const results: string[] = [];

  for (const file of allFiles) {
    const fileDir = dirname(file);

    // Same directory
    if (fileDir === sourceDir) {
      if (isTestFile(file) && file !== sourceFile) {
        results.push(file);
      }
      continue;
    }

    // __tests__ subdirectory
    if (
      fileDir === `${sourceDir}/__tests__` ||
      fileDir === `${sourceDir}/test`
    ) {
      results.push(file);
    }
  }

  return results;
}

/**
 * Check if a file is a test file based on path
 */
function isTestFile(filePath: string): boolean {
  const name = basename(filePath);
  return (
    name.includes(".spec.") ||
    name.includes(".test.") ||
    isInTestFolder(filePath)
  );
}

/**
 * Get all unique modules affected by changed files
 */
export function getAffectedModules(changedFiles: string[]): Set<string> {
  const modules = new Set<string>();
  for (const file of changedFiles) {
    modules.add(getModuleName(file));
  }
  return modules;
}

/**
 * Calculate risk weight based on folder conventions
 */
export function calculateFolderRiskWeight(changedFiles: string[]): number {
  let weight = 0;

  const highRiskCount = changedFiles.filter(
    (f) => getFolderRiskLevel(f) === "high",
  ).length;
  const mediumRiskCount = changedFiles.filter(
    (f) => getFolderRiskLevel(f) === "medium",
  ).length;
  const moduleCount = getAffectedModules(changedFiles).size;

  weight += highRiskCount * 3;
  weight += mediumRiskCount * 1;
  weight += Math.max(0, moduleCount - 1) * 2; // Penalty for affecting multiple modules

  return weight;
}
