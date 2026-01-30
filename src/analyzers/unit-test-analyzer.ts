// ============================================
// Sawrin - Unit Test Analyzer
// ============================================
// Detects impacted unit tests using multiple heuristics

import type { ImpactedFile, ImpactReason } from "../types/index.js";
import type { Analyzer, AnalyzerContext } from "./base-analyzer.js";
import { getAffectedFiles } from "../core/dependency-graph.js";
import {
  isTestFile,
  matchTestFiles,
  getSourceFileFromTest,
} from "../heuristics/naming-conventions.js";
import { isInTestFolder } from "../heuristics/folder-conventions.js";

/**
 * Unit Test Impact Analyzer
 */
export const unitTestAnalyzer: Analyzer<ImpactedFile[]> = {
  name: "unit-test-analyzer",

  async analyze(context: AnalyzerContext): Promise<ImpactedFile[]> {
    const { changedFiles, dependencyGraph, allFiles } = context;
    const impactedTests = new Map<string, ImpactReason[]>();

    const changedPaths = changedFiles.map((f) => f.path);

    // 1. Direct test file changes
    for (const file of changedFiles) {
      if (isTestFile(file.path) || isInTestFolder(file.path)) {
        addImpact(impactedTests, file.path, {
          type: "direct_change",
          description: "Test file was directly modified",
        });
      }
    }

    // 2. Naming convention matching
    for (const file of changedFiles) {
      if (isTestFile(file.path)) continue;

      const matchedTests = matchTestFiles(file.path, allFiles);
      for (const testFile of matchedTests) {
        addImpact(impactedTests, testFile, {
          type: "naming_convention",
          description: `Test matches source file naming pattern`,
          relatedFile: file.path,
        });
      }
    }

    // 3. Import graph traversal
    const affectedFiles = getAffectedFiles(changedPaths, dependencyGraph);
    for (const [affectedFile, depth] of affectedFiles) {
      if (isTestFile(affectedFile) || isInTestFolder(affectedFile)) {
        // This test imports a changed file (directly or transitively)
        const changedDep = findClosestChangedDependency(
          affectedFile,
          changedPaths,
          dependencyGraph,
        );

        addImpact(impactedTests, affectedFile, {
          type: "imports_changed",
          description:
            depth === 1
              ? `Directly imports changed file`
              : `Transitively imports changed file (depth: ${depth})`,
          relatedFile: changedDep || undefined,
        });
      }
    }

    // 4. Tests that import changed files
    for (const file of changedFiles) {
      const importers = dependencyGraph.importedBy.get(file.path);
      if (importers) {
        for (const importer of importers) {
          if (isTestFile(importer) || isInTestFolder(importer)) {
            // Already handled in import graph traversal
          }
        }
      }
    }

    // 5. Co-located tests (same folder as changed file)
    for (const file of changedFiles) {
      if (isTestFile(file.path)) continue;

      const sourceFile = file.path;
      const sourceDir = getDirname(sourceFile);

      for (const testFile of allFiles) {
        if (!isTestFile(testFile)) continue;
        if (impactedTests.has(testFile)) continue;

        const testDir = getDirname(testFile);

        // Check if test is in __tests__ subfolder
        if (
          testDir === `${sourceDir}/__tests__` ||
          testDir === `${sourceDir}/test` ||
          testDir === `${sourceDir}/tests`
        ) {
          addImpact(impactedTests, testFile, {
            type: "folder_convention",
            description: `Co-located in test subfolder of changed module`,
            relatedFile: sourceFile,
          });
        }
      }
    }

    // Convert map to array
    const results: ImpactedFile[] = [];
    for (const [path, reasons] of impactedTests) {
      results.push({ path, reasons });
    }

    // Sort by number of reasons (more confident matches first)
    results.sort((a, b) => b.reasons.length - a.reasons.length);

    return results;
  },
};

/**
 * Add an impact reason to a test file
 */
function addImpact(
  map: Map<string, ImpactReason[]>,
  testFile: string,
  reason: ImpactReason,
): void {
  if (!map.has(testFile)) {
    map.set(testFile, []);
  }

  const reasons = map.get(testFile)!;

  // Avoid duplicate reasons
  const isDuplicate = reasons.some(
    (r) => r.type === reason.type && r.relatedFile === reason.relatedFile,
  );

  if (!isDuplicate) {
    reasons.push(reason);
  }
}

/**
 * Find the closest changed file in the dependency chain
 */
function findClosestChangedDependency(
  file: string,
  changedPaths: string[],
  graph: { imports: Map<string, Set<string>> },
): string | null {
  const imports = graph.imports.get(file);
  if (!imports) return null;

  for (const imp of imports) {
    if (changedPaths.includes(imp)) {
      return imp;
    }
  }

  // Check transitive imports (one level deep for performance)
  for (const imp of imports) {
    const subImports = graph.imports.get(imp);
    if (subImports) {
      for (const subImp of subImports) {
        if (changedPaths.includes(subImp)) {
          return subImp;
        }
      }
    }
  }

  return changedPaths[0] || null;
}

/**
 * Get directory name from path
 */
function getDirname(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  parts.pop();
  return parts.join("/");
}

export default unitTestAnalyzer;
