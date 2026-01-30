// ============================================
// Sawrin - Dependency Graph Builder
// ============================================
// Builds an import/export graph from TypeScript/JavaScript files

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, relative } from "path";
import { glob } from "glob";
import type { DependencyGraph, MonorepoInfo } from "../types/index.js";
import { resolvePackageImport } from "./monorepo.js";
import { CacheManager } from "./cache.js";

/**
 * Build the dependency graph for a project
 */
/**
 * Build the dependency graph for a project
 */
export async function buildDependencyGraph(
  rootPath: string,
  options: {
    noCache?: boolean;
    monorepo?: MonorepoInfo | null;
  } = {},
): Promise<DependencyGraph> {
  const { noCache = false, monorepo = null } = options;

  const graph: DependencyGraph = {
    imports: new Map(),
    importedBy: new Map(),
    exports: new Map(),
  };

  const cache = noCache ? null : new CacheManager(rootPath);
  if (cache && !noCache) {
    // We can expose this via option later, for now internal check
  }

  // Find all TypeScript/JavaScript files
  const files = await glob("**/*.{ts,tsx,js,jsx}", {
    cwd: rootPath,
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/*.d.ts"],
    absolute: false,
  });

  // Build imports for each file
  for (const file of files) {
    const absolutePath = resolve(rootPath, file);

    let imports: Set<string>;

    if (cache) {
      const content = readFileSync(absolutePath, "utf-8");
      const hash = cache.getFileHash(content);
      const cachedImports = cache.get(file, hash);

      if (cachedImports) {
        imports = new Set(cachedImports);
      } else {
        // Use unified extraction logic
        imports = monorepo
          ? extractImportsWithMonorepo(absolutePath, rootPath, monorepo)
          : extractImports(absolutePath, rootPath);
        cache.set(file, hash, Array.from(imports));
      }
    } else {
      imports = monorepo
        ? extractImportsWithMonorepo(absolutePath, rootPath, monorepo)
        : extractImports(absolutePath, rootPath);
    }

    graph.imports.set(file, imports);

    // Build reverse mapping (importedBy)
    for (const importedFile of imports) {
      if (!graph.importedBy.has(importedFile)) {
        graph.importedBy.set(importedFile, new Set());
      }
      graph.importedBy.get(importedFile)!.add(file);
    }

    // Extract exports (caching exports is future optimization)
    const exports = extractExports(absolutePath);
    graph.exports.set(file, exports);
  }

  if (cache) {
    cache.save();
  }

  return graph;
}

/**
 * @deprecated Use buildDependencyGraph with options object
 */
export async function buildDependencyGraphWithMonorepo(
  rootPath: string,
  monorepo: MonorepoInfo | null,
  noCache: boolean = false,
): Promise<DependencyGraph> {
  return buildDependencyGraph(rootPath, { monorepo, noCache });
}

/**
 * Extract imports from a file
 */
export function extractImports(
  filePath: string,
  rootPath: string,
): Set<string> {
  const imports = new Set<string>();

  if (!existsSync(filePath)) {
    return imports;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const fileDir = dirname(filePath);

    // Match various import patterns
    const importPatterns = [
      // ES6 imports: import x from './path'
      /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g,
      // Dynamic imports: import('./path')
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // Require: require('./path')
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // Export from: export { x } from './path'
      /export\s+(?:[\w*{}\s,]+\s+)?from\s+['"]([^'"]+)['"]/g,
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const resolved = resolveImportPath(importPath, fileDir, rootPath);
        if (resolved) {
          imports.add(resolved);
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return imports;
}

/**
 * Extract imports from a file with monorepo support
 */
export function extractImportsWithMonorepo(
  filePath: string,
  rootPath: string,
  monorepo: MonorepoInfo | null,
): Set<string> {
  const imports = new Set<string>();

  if (!existsSync(filePath)) {
    return imports;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const fileDir = dirname(filePath);

    // Match various import patterns
    const importPatterns = [
      /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /export\s+(?:[\w*{}\s,]+\s+)?from\s+['"]([^'"]+)['"]/g,
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const resolved = resolveImportPathWithMonorepo(
          importPath,
          fileDir,
          rootPath,
          monorepo,
        );
        if (resolved) {
          imports.add(resolved);
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return imports;
}

/**
 * Resolve an import path to a relative file path
 */
export function resolveImportPath(
  importPath: string,
  fromDir: string,
  rootPath: string,
): string | null {
  // Skip external packages
  if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
    // Could be an alias like @/utils - skip for now
    if (!importPath.startsWith("@/") && !importPath.startsWith("~/")) {
      return null;
    }
    // Handle common aliases
    importPath = importPath.replace(/^[@~]\//, "./src/");
  }

  // Resolve relative path
  const absolutePath = resolve(fromDir, importPath);

  // Try various extensions
  const extensions = [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    "/index.ts",
    "/index.tsx",
    "/index.js",
  ];

  for (const ext of extensions) {
    const fullPath = absolutePath + ext;
    if (existsSync(fullPath)) {
      return relative(rootPath, fullPath).replace(/\\/g, "/");
    }
  }

  return null;
}

/**
 * Resolve an import path with monorepo support
 */
export function resolveImportPathWithMonorepo(
  importPath: string,
  fromDir: string,
  rootPath: string,
  monorepo: MonorepoInfo | null,
): string | null {
  // First, try to resolve as a monorepo package
  if (
    monorepo?.isMonorepo &&
    !importPath.startsWith(".") &&
    !importPath.startsWith("/")
  ) {
    // Check if it's an internal package
    const packageName = getPackageNameFromImport(importPath);
    if (monorepo.packageMap.has(packageName)) {
      const resolved = resolvePackageImport(packageName, monorepo);
      if (resolved) {
        return resolved;
      }
    }
  }

  // Fall back to normal resolution
  return resolveImportPath(importPath, fromDir, rootPath);
}

/**
 * Extract package name from import path (e.g., @app/utils/foo -> @app/utils)
 */
function getPackageNameFromImport(importPath: string): string {
  if (importPath.startsWith("@")) {
    // Scoped package: @scope/name or @scope/name/subpath
    const parts = importPath.split("/");
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  }
  // Unscoped package: name or name/subpath
  return importPath.split("/")[0];
}

/**
 * Extract exports from a file (for future use)
 */
export function extractExports(filePath: string): Set<string> {
  const exports = new Set<string>();

  if (!existsSync(filePath)) {
    return exports;
  }

  try {
    const content = readFileSync(filePath, "utf-8");

    // Match export patterns
    const exportPatterns = [
      // Named exports: export const x, export function x, export class x
      /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g,
      // Export list: export { x, y }
      /export\s*\{([^}]+)\}/g,
      // Default export
      /export\s+default/g,
    ];

    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          // For export { x, y }, split and add each
          const names = match[1].split(",").map((n) =>
            n
              .trim()
              .split(/\s+as\s+/)[0]
              .trim(),
          );
          names.forEach((name) => {
            if (name && !name.includes("{")) {
              exports.add(name);
            }
          });
        }
      }
    }

    // Check for default export
    if (/export\s+default/.test(content)) {
      exports.add("default");
    }
  } catch {
    // Ignore read errors
  }

  return exports;
}

/**
 * Get all files that are affected by changes to the given files
 * (transitive closure of importedBy relationship)
 */
export function getAffectedFiles(
  changedFiles: string[],
  graph: DependencyGraph,
  maxDepth: number = 10,
): Map<string, number> {
  const affected = new Map<string, number>(); // file -> depth
  const queue: Array<{ file: string; depth: number }> = [];

  // Initialize with changed files at depth 0
  for (const file of changedFiles) {
    affected.set(file, 0);
    queue.push({ file, depth: 0 });
  }

  // BFS to find all affected files
  while (queue.length > 0) {
    const { file, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;

    const importers = graph.importedBy.get(file);
    if (importers) {
      for (const importer of importers) {
        if (!affected.has(importer) || affected.get(importer)! > depth + 1) {
          affected.set(importer, depth + 1);
          queue.push({ file: importer, depth: depth + 1 });
        }
      }
    }
  }

  return affected;
}
