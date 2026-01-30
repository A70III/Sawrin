// ============================================
// Sawrin - Route Pattern Detection
// ============================================
// Extract API routes from Express/NestJS code patterns

import { readFileSync, existsSync } from "fs";
import type { DetectedRoute } from "../types/index.js";

type HttpMethod = DetectedRoute["method"];

/**
 * Express.js route patterns
 */
const EXPRESS_PATTERNS: Array<{
  regex: RegExp;
  methodIndex: number;
  pathIndex: number;
}> = [
  // app.get('/path', ...) or router.get('/path', ...)
  {
    regex:
      /(?:app|router)\s*\.\s*(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    methodIndex: 1,
    pathIndex: 2,
  },
  // app.use('/path', router)
  {
    regex: /(?:app|router)\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    methodIndex: -1, // No specific method
    pathIndex: 1,
  },
];

/**
 * NestJS decorator patterns
 */
const NESTJS_PATTERNS: Array<{ regex: RegExp; method: HttpMethod | null }> = [
  { regex: /@Get\s*\(\s*['"`]?([^'"`\)]*?)['"`]?\s*\)/gi, method: "GET" },
  { regex: /@Post\s*\(\s*['"`]?([^'"`\)]*?)['"`]?\s*\)/gi, method: "POST" },
  { regex: /@Put\s*\(\s*['"`]?([^'"`\)]*?)['"`]?\s*\)/gi, method: "PUT" },
  { regex: /@Delete\s*\(\s*['"`]?([^'"`\)]*?)['"`]?\s*\)/gi, method: "DELETE" },
  { regex: /@Patch\s*\(\s*['"`]?([^'"`\)]*?)['"`]?\s*\)/gi, method: "PATCH" },
];

/**
 * Extract @Controller base path
 */
const CONTROLLER_PATTERN = /@Controller\s*\(\s*['"`]?([^'"`\)]*?)['"`]?\s*\)/i;

/**
 * Extract routes from a file
 */
export function extractRoutes(filePath: string): DetectedRoute[] {
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const routes: DetectedRoute[] = [];

    // Try NestJS patterns first
    const nestRoutes = extractNestJSRoutes(content, filePath);
    if (nestRoutes.length > 0) {
      return nestRoutes;
    }

    // Try Express patterns
    const expressRoutes = extractExpressRoutes(content, filePath);
    if (expressRoutes.length > 0) {
      return expressRoutes;
    }

    return routes;
  } catch {
    return [];
  }
}

/**
 * Extract NestJS routes
 */
function extractNestJSRoutes(
  content: string,
  filePath: string,
): DetectedRoute[] {
  const routes: DetectedRoute[] = [];

  // Get base path from @Controller
  let basePath = "";
  const controllerMatch = content.match(CONTROLLER_PATTERN);
  if (controllerMatch) {
    basePath = controllerMatch[1] || "";
  }

  // Extract route decorators
  for (const pattern of NESTJS_PATTERNS) {
    let match;
    pattern.regex.lastIndex = 0; // Reset regex state

    while ((match = pattern.regex.exec(content)) !== null) {
      const routePath = match[1] || "";
      const fullPath = normalizePath(`/${basePath}/${routePath}`);

      routes.push({
        method: pattern.method!,
        path: fullPath,
        sourceFile: filePath,
        lineNumber: getLineNumber(content, match.index),
      });
    }
  }

  return routes;
}

/**
 * Extract Express routes
 */
function extractExpressRoutes(
  content: string,
  filePath: string,
): DetectedRoute[] {
  const routes: DetectedRoute[] = [];

  for (const pattern of EXPRESS_PATTERNS) {
    let match;
    pattern.regex.lastIndex = 0;

    while ((match = pattern.regex.exec(content)) !== null) {
      const method =
        pattern.methodIndex > 0
          ? (match[pattern.methodIndex].toUpperCase() as HttpMethod)
          : "ALL";
      const path = normalizePath(match[pattern.pathIndex]);

      routes.push({
        method,
        path,
        sourceFile: filePath,
        lineNumber: getLineNumber(content, match.index),
      });
    }
  }

  return routes;
}

/**
 * Normalize a route path
 */
function normalizePath(path: string): string {
  // Remove leading/trailing slashes and normalize
  let normalized = path.replace(/\/+/g, "/");
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }
  if (normalized.endsWith("/") && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Get line number for a character index
 */
function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split("\n").length;
}

/**
 * Check if a path matches a route pattern
 * Supports :param style parameters
 */
export function routeMatches(routePath: string, testPath: string): boolean {
  // Normalize both paths
  const normalizedRoute = normalizePath(routePath).toLowerCase();
  const normalizedTest = normalizePath(testPath).toLowerCase();

  // Exact match
  if (normalizedRoute === normalizedTest) {
    return true;
  }

  // Convert route params to regex
  const routeParts = normalizedRoute.split("/").filter(Boolean);
  const testParts = normalizedTest.split("/").filter(Boolean);

  if (routeParts.length !== testParts.length) {
    return false;
  }

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const testPart = testParts[i];

    // Parameter match
    if (routePart.startsWith(":") || routePart.startsWith("{")) {
      continue;
    }

    // Exact match required
    if (routePart !== testPart) {
      return false;
    }
  }

  return true;
}

/**
 * Get route similarity score (0-1)
 */
export function getRouteSimilarity(route1: string, route2: string): number {
  const parts1 = normalizePath(route1).toLowerCase().split("/").filter(Boolean);
  const parts2 = normalizePath(route2).toLowerCase().split("/").filter(Boolean);

  if (parts1.length === 0 || parts2.length === 0) {
    return 0;
  }

  let matchingParts = 0;
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    const p1 = parts1[i];
    const p2 = parts2[i];

    if (p1 === p2) {
      matchingParts++;
    } else if (p1.startsWith(":") || p2.startsWith(":")) {
      matchingParts += 0.5; // Partial match for params
    }
  }

  return matchingParts / maxLength;
}
