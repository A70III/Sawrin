// ============================================
// Sawrin - API Test Analyzer (Bruno)
// ============================================
// Detects impacted Bruno API tests

import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { glob } from "glob";
import type {
  ImpactedFile,
  BrunoTestFile,
  DetectedRoute,
} from "../types/index.js";
import type { Analyzer, AnalyzerContext } from "./base-analyzer.js";
import { addImpact } from "../shared/utils.js";
import {
  extractRoutes,
  routeMatches,
  getRouteSimilarity,
} from "../heuristics/route-patterns.js";

/**
 * API Test Impact Analyzer for Bruno collections
 */
export const apiTestAnalyzer: Analyzer<ImpactedFile[]> = {
  name: "api-test-analyzer",

  async analyze(context: AnalyzerContext): Promise<ImpactedFile[]> {
    const { changedFiles, projectRoot } = context;
    const impactedTests = new Map<string, any[]>();

    // Find Bruno collection path
    const brunoPath = await findBrunoPath(projectRoot);
    if (!brunoPath) {
      return [];
    }

    // Parse Bruno test files
    const brunoTests = await parseBrunoCollection(brunoPath);
    if (brunoTests.length === 0) {
      return [];
    }

    // Extract routes from changed source files
    const changedRoutes: DetectedRoute[] = [];
    for (const file of changedFiles) {
      const absolutePath = resolve(projectRoot, file.path);
      if (existsSync(absolutePath)) {
        const routes = extractRoutes(absolutePath);
        changedRoutes.push(...routes);
      }
    }

    // 1. Route matching
    for (const route of changedRoutes) {
      for (const brunoTest of brunoTests) {
        if (brunoTest.url && routeMatches(route.path, brunoTest.url)) {
          addImpact(impactedTests, brunoTest.path, {
            type: "route_match",
            description: `Route ${route.method} ${route.path} matches test URL`,
            relatedFile: route.sourceFile,
          });
        }
      }
    }

    // 2. Folder similarity matching
    for (const file of changedFiles) {
      const folderName = extractModuleFolder(file.path);
      if (!folderName) continue;

      for (const brunoTest of brunoTests) {
        if (
          brunoTest.folder.toLowerCase().includes(folderName.toLowerCase()) ||
          folderName.toLowerCase().includes(brunoTest.folder.toLowerCase())
        ) {
          addImpact(impactedTests, brunoTest.path, {
            type: "folder_convention",
            description: `Bruno folder "${brunoTest.folder}" matches module "${folderName}"`,
            relatedFile: file.path,
          });
        }
      }
    }

    // 3. Route similarity (fuzzy matching)
    for (const route of changedRoutes) {
      for (const brunoTest of brunoTests) {
        if (!brunoTest.url) continue;
        if (impactedTests.has(brunoTest.path)) continue;

        const similarity = getRouteSimilarity(route.path, brunoTest.url);
        if (similarity >= 0.6) {
          addImpact(impactedTests, brunoTest.path, {
            type: "route_match",
            description: `Route ${route.path} similar to test URL (${Math.round(similarity * 100)}% match)`,
            relatedFile: route.sourceFile,
          });
        }
      }
    }

    // Convert map to array
    const results: ImpactedFile[] = [];
    for (const [path, reasons] of impactedTests) {
      results.push({ path, reasons });
    }

    return results;
  },
};

/**
 * Find Bruno collection directory
 */
async function findBrunoPath(projectRoot: string): Promise<string | null> {
  // Common Bruno paths
  const possiblePaths = [
    "bruno",
    "api-tests",
    "api",
    "tests/bruno",
    "tests/api",
  ];

  for (const p of possiblePaths) {
    const fullPath = resolve(projectRoot, p);
    if (existsSync(fullPath)) {
      // Check if it contains .bru files
      const bruFiles = await glob("**/*.bru", { cwd: fullPath });
      if (bruFiles.length > 0) {
        return fullPath;
      }
    }
  }

  // Search for any .bru files
  const bruFiles = await glob("**/*.bru", {
    cwd: projectRoot,
    ignore: ["node_modules/**"],
  });

  if (bruFiles.length > 0) {
    // Return the directory containing the first .bru file
    return resolve(projectRoot, dirname(bruFiles[0])).replace(/\\/g, "/");
  }

  return null;
}

/**
 * Parse Bruno collection
 */
async function parseBrunoCollection(
  brunoPath: string,
): Promise<BrunoTestFile[]> {
  const tests: BrunoTestFile[] = [];

  const bruFiles = await glob("**/*.bru", { cwd: brunoPath });

  for (const file of bruFiles) {
    const fullPath = resolve(brunoPath, file);
    const parsed = parseBruFile(fullPath);

    tests.push({
      path: file,
      method: parsed.method,
      url: parsed.url,
      tags: parsed.tags,
      folder: dirname(file).replace(/\\/g, "/") || "root",
    });
  }

  return tests;
}

/**
 * Parse a single .bru file
 */
function parseBruFile(filePath: string): {
  method?: string;
  url?: string;
  tags?: string[];
} {
  try {
    const content = readFileSync(filePath, "utf-8");
    const result: { method?: string; url?: string; tags?: string[] } = {};

    // Extract HTTP method
    const methodMatch = content.match(/^(get|post|put|delete|patch)\s*{/im);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase();
    }

    // Extract URL
    const urlMatch = content.match(/url:\s*(.+)/i);
    if (urlMatch) {
      let url = urlMatch[1].trim();
      // Remove variables like {{baseUrl}}
      url = url.replace(/\{\{[^}]+\}\}/g, "");
      // Extract path from full URL
      const pathMatch = url.match(/(?:https?:\/\/[^\/]+)?(.+)/);
      if (pathMatch) {
        result.url = pathMatch[1].trim() || "/";
      }
    }

    // Extract tags
    const tagsMatch = content.match(/tags:\s*\[([^\]]+)\]/i);
    if (tagsMatch) {
      result.tags = tagsMatch[1]
        .split(",")
        .map((t) => t.trim().replace(/['"]/g, ""))
        .filter(Boolean);
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Extract module folder name from path
 */
function extractModuleFolder(filePath: string): string | null {
  const parts = filePath.replace(/\\/g, "/").split("/");

  // Look for meaningful folder names
  const skipFolders = ["src", "lib", "app", "dist", "build"];

  for (const part of parts) {
    if (part && !skipFolders.includes(part.toLowerCase())) {
      return part;
    }
  }

  return null;
}

export default apiTestAnalyzer;
