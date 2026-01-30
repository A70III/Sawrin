// ============================================
// Sawrin - Monorepo Support
// ============================================
// Detect and analyze monorepo structures (npm workspaces, pnpm, lerna, nx, turbo)

import { readFileSync, existsSync, statSync } from "fs";
import { resolve, relative, dirname, join } from "path";
import { glob } from "glob";
import type { MonorepoInfo, Workspace, PackageInfo } from "../types/index.js";

/**
 * Detect if the project is a monorepo and return its structure
 */
export async function detectMonorepo(rootPath: string): Promise<MonorepoInfo> {
  const result: MonorepoInfo = {
    isMonorepo: false,
    rootPath,
    type: "unknown",
    workspaces: [],
    packageMap: new Map(),
  };

  // Check for various monorepo configs
  const packageJsonPath = resolve(rootPath, "package.json");
  if (!existsSync(packageJsonPath)) {
    return result;
  }

  const packageJson = readPackageJson(packageJsonPath);
  if (!packageJson) {
    return result;
  }

  // 1. Check npm/yarn workspaces in package.json
  if (packageJson.workspaces) {
    result.isMonorepo = true;
    result.type = "npm";
    const patterns = Array.isArray(packageJson.workspaces)
      ? packageJson.workspaces
      : packageJson.workspaces.packages || [];
    result.workspaces = await findWorkspaces(rootPath, patterns);
  }

  // 2. Check pnpm-workspace.yaml
  const pnpmWorkspacePath = resolve(rootPath, "pnpm-workspace.yaml");
  if (existsSync(pnpmWorkspacePath)) {
    result.isMonorepo = true;
    result.type = "pnpm";
    const patterns = parsePnpmWorkspace(pnpmWorkspacePath);
    result.workspaces = await findWorkspaces(rootPath, patterns);
  }

  // 3. Check lerna.json
  const lernaPath = resolve(rootPath, "lerna.json");
  if (existsSync(lernaPath)) {
    result.isMonorepo = true;
    result.type = "lerna";
    const lernaConfig = readJsonFile(lernaPath);
    const rawPatterns = lernaConfig?.packages;
    const patterns = Array.isArray(rawPatterns)
      ? (rawPatterns as string[])
      : ["packages/*"];
    result.workspaces = await findWorkspaces(rootPath, patterns);
  }

  // 4. Check nx.json
  const nxPath = resolve(rootPath, "nx.json");
  if (existsSync(nxPath)) {
    result.isMonorepo = true;
    result.type = "nx";
    // Nx typically uses packages/* or apps/* and libs/*
    const patterns = ["packages/*", "apps/*", "libs/*"];
    result.workspaces = await findWorkspaces(rootPath, patterns);
  }

  // 5. Check turbo.json
  const turboPath = resolve(rootPath, "turbo.json");
  if (existsSync(turboPath)) {
    result.isMonorepo = true;
    result.type = "turbo";
    // Turbo uses npm workspaces, already handled above
  }

  // Build package map and resolve internal dependencies
  if (result.isMonorepo) {
    result.packageMap = buildPackageMap(result.workspaces);
    resolveInternalDependencies(result.workspaces, result.packageMap);
  }

  return result;
}

/**
 * Find all workspaces matching the given patterns
 */
async function findWorkspaces(
  rootPath: string,
  patterns: string[],
): Promise<Workspace[]> {
  const workspaces: Workspace[] = [];

  for (const pattern of patterns) {
    // Find directories matching the pattern
    const matches = await glob(pattern, {
      cwd: rootPath,
      absolute: false,
    });

    for (const match of matches) {
      const absolutePath = resolve(rootPath, match);
      const packageJsonPath = resolve(absolutePath, "package.json");

      if (existsSync(packageJsonPath)) {
        const packageJson = readPackageJson(packageJsonPath);
        if (packageJson?.name) {
          workspaces.push({
            name: packageJson.name,
            path: absolutePath,
            relativePath: match,
            internalDependencies: [],
            dependedBy: [],
          });
        }
      }
    }
  }

  return workspaces;
}

/**
 * Build a map of package name to Workspace
 */
function buildPackageMap(workspaces: Workspace[]): Map<string, Workspace> {
  const map = new Map<string, Workspace>();
  for (const ws of workspaces) {
    map.set(ws.name, ws);
  }
  return map;
}

/**
 * Resolve internal dependencies between packages
 */
function resolveInternalDependencies(
  workspaces: Workspace[],
  packageMap: Map<string, Workspace>,
): void {
  for (const ws of workspaces) {
    const packageJsonPath = resolve(ws.path, "package.json");
    const packageJson = readPackageJson(packageJsonPath);
    if (!packageJson) continue;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const depName of Object.keys(allDeps)) {
      if (packageMap.has(depName)) {
        ws.internalDependencies.push(depName);
        packageMap.get(depName)!.dependedBy.push(ws.name);
      }
    }
  }
}

/**
 * Get the package that contains a given file path
 */
export function getPackageForFile(
  filePath: string,
  monorepo: MonorepoInfo,
): Workspace | null {
  if (!monorepo.isMonorepo) return null;

  const absolutePath = resolve(monorepo.rootPath, filePath);

  for (const ws of monorepo.workspaces) {
    if (absolutePath.startsWith(ws.path)) {
      return ws;
    }
  }

  return null;
}

/**
 * Get all packages that would be affected by changes to the given packages
 */
export function getAffectedPackages(
  changedPackages: string[],
  monorepo: MonorepoInfo,
): Set<string> {
  const affected = new Set<string>(changedPackages);
  const queue = [...changedPackages];

  while (queue.length > 0) {
    const pkgName = queue.shift()!;
    const ws = monorepo.packageMap.get(pkgName);
    if (!ws) continue;

    for (const depName of ws.dependedBy) {
      if (!affected.has(depName)) {
        affected.add(depName);
        queue.push(depName);
      }
    }
  }

  return affected;
}

/**
 * Resolve a package import to its entry file
 */
/**
 * Resolve a package import (including subpaths) to a file path
 */
export function resolvePackageImport(
  importPath: string,
  monorepo: MonorepoInfo,
): string | null {
  const packageName = getPackageNameFromImport(importPath);
  const ws = monorepo.packageMap.get(packageName);
  if (!ws) return null;

  const packageJsonPath = resolve(ws.path, "package.json");
  const packageJson = readPackageJson(packageJsonPath);
  if (!packageJson) return null;

  // Determine subpath (e.g., @app/ui/button -> ./button)
  let subpath = ".";
  if (importPath.length > packageName.length) {
    const rawSubpath = importPath.slice(packageName.length);
    // Ensure it starts with ./
    subpath = rawSubpath.startsWith("/") ? `.${rawSubpath}` : `./${rawSubpath}`;
  }

  // 1. Check "exports" field (modern Node.js)
  if (packageJson.exports) {
    const resolved = resolveExports(packageJson.exports, subpath);
    if (resolved) {
      const absPath = resolve(ws.path, resolved);
      if (existsSync(absPath)) {
        return relative(monorepo.rootPath, absPath).replace(/\\/g, "/");
      }
      // Try with extensions if direct match failed
      const withExt = resolveWithExtensions(absPath);
      if (withExt) {
        return relative(monorepo.rootPath, withExt).replace(/\\/g, "/");
      }
    }
  }

  // 2. Legacy resolution (main/module or direct file mapping)
  if (subpath === ".") {
    // Main entry point
    const entryPoints = [
      packageJson.main,
      packageJson.module,
      "src/index.ts",
      "src/index.js",
      "index.ts",
      "index.js",
    ];

    for (const entry of entryPoints) {
      if (!entry) continue;
      const entryPath = resolve(ws.path, entry);
      const resolved = resolveWithExtensions(entryPath);
      if (resolved) {
        return relative(monorepo.rootPath, resolved).replace(/\\/g, "/");
      }
    }
  } else {
    // Direct file access: @app/ui/button -> packages/ui/button.ts
    // subpath is like ./button
    const relativeFile = subpath.slice(2); // remove ./
    const absPath = resolve(ws.path, relativeFile);
    const resolved = resolveWithExtensions(absPath);
    if (resolved) {
      return relative(monorepo.rootPath, resolved).replace(/\\/g, "/");
    }

    // Also try src/ prefix which is common in TS repos
    // @app/ui/button -> packages/ui/src/button.ts
    const srcPath = resolve(ws.path, "src", relativeFile);
    const resolvedSrc = resolveWithExtensions(srcPath);
    if (resolvedSrc) {
      return relative(monorepo.rootPath, resolvedSrc).replace(/\\/g, "/");
    }
  }

  return null;
}

/**
 * Helper to resolve exports field
 */
function resolveExports(exports: any, subpath: string): string | null {
  if (typeof exports === "string") {
    return subpath === "." ? exports : null;
  }

  if (typeof exports === "object") {
    // Exact match
    if (exports[subpath]) {
      return exports[subpath];
    }

    // Directory match (e.g. "./*": "./dist/*.js")
    // Simple implementation for now
    for (const key of Object.keys(exports)) {
      if (key.includes("*")) {
        const prefix = key.split("*")[0];
        if (subpath.startsWith(prefix)) {
          // Replace * in target
          const suffix = subpath.slice(prefix.length);
          const target = exports[key];
          return target.replace("*", suffix);
        }
      }
    }
  }

  return null;
}

/**
 * Helper to resolve file with extensions
 */
function resolveWithExtensions(filePath: string): string | null {
  if (existsSync(filePath) && !filePath.endsWith("/")) {
    // naive file check
    // Check if it's a directory, if so look for index
    try {
      const stats = statSync(filePath);
      if (stats.isDirectory()) {
        const indexTs = join(filePath, "index.ts");
        if (existsSync(indexTs)) return indexTs;
        const indexJs = join(filePath, "index.js");
        if (existsSync(indexJs)) return indexJs;
      }
    } catch {}
    return filePath;
  }

  const extensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    "/index.ts",
    "/index.tsx",
    "/index.js",
  ];
  for (const ext of extensions) {
    const p = filePath + ext;
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Extract package name from import path
 */
function getPackageNameFromImport(importPath: string): string {
  if (importPath.startsWith("@")) {
    const parts = importPath.split("/");
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  }
  return importPath.split("/")[0];
}

// ============================================
// Helper Functions
// ============================================

function readPackageJson(path: string): PackageInfo | null {
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function readJsonFile(path: string): Record<string, unknown> | null {
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function parsePnpmWorkspace(path: string): string[] {
  try {
    const content = readFileSync(path, "utf-8");
    // Simple YAML parsing for packages array
    const match = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)+)/);
    if (match) {
      const lines = match[1].split("\n");
      return lines
        .map((line) => line.replace(/^\s+-\s+['"]?([^'"]+)['"]?\s*$/, "$1"))
        .filter(Boolean);
    }
    return ["packages/*"];
  } catch {
    return ["packages/*"];
  }
}
