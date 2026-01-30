// ============================================
// Sawrin - Configuration Loader
// ============================================
// Load and validate .sawrinrc.json or sawrin.config.js

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import type { SawrinConfig } from "../types/index.js";

/**
 * Configuration file names to search for (in order of priority)
 */
const CONFIG_FILES = [
  ".sawrinrc.json",
  ".sawrinrc",
  "sawrin.config.json",
  "sawrin.config.js",
  "sawrin.config.mjs",
];

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SawrinConfig = {
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/.git/**",
  ],
  testPatterns: [
    "**/*.test.{ts,tsx,js,jsx}",
    "**/*.spec.{ts,tsx,js,jsx}",
    "**/__tests__/**/*.{ts,tsx,js,jsx}",
  ],
  brunoPath: undefined,
  riskWeights: {},
  folderMappings: {},
  highRiskFiles: [],
  lowRiskFiles: [],
  maxDepth: 10,
};

/**
 * Load configuration from project root
 */
export async function loadConfig(rootPath: string): Promise<SawrinConfig> {
  const configPath = findConfigFile(rootPath);

  if (!configPath) {
    return { ...DEFAULT_CONFIG };
  }

  const userConfig = await parseConfigFile(configPath);
  return mergeConfig(DEFAULT_CONFIG, userConfig);
}

/**
 * Find the configuration file in the project
 */
export function findConfigFile(rootPath: string): string | null {
  for (const fileName of CONFIG_FILES) {
    const filePath = resolve(rootPath, fileName);
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

/**
 * Parse configuration file based on its extension
 */
async function parseConfigFile(
  configPath: string,
): Promise<Partial<SawrinConfig>> {
  const ext = configPath.split(".").pop()?.toLowerCase();

  try {
    if (ext === "json" || configPath.endsWith(".sawrinrc")) {
      // JSON config
      const content = readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    } else if (ext === "js" || ext === "mjs") {
      // JavaScript config (dynamic import)
      const configModule = await import(`file://${configPath}`);
      return configModule.default || configModule;
    }
  } catch (error) {
    console.warn(`Warning: Failed to parse config file ${configPath}:`, error);
  }

  return {};
}

/**
 * Merge user config with default config
 */
export function mergeConfig(
  defaults: SawrinConfig,
  userConfig: Partial<SawrinConfig>,
): SawrinConfig {
  return {
    ignorePatterns: userConfig.ignorePatterns ?? defaults.ignorePatterns,
    testPatterns: userConfig.testPatterns ?? defaults.testPatterns,
    brunoPath: userConfig.brunoPath ?? defaults.brunoPath,
    riskWeights: {
      ...defaults.riskWeights,
      ...userConfig.riskWeights,
    },
    folderMappings: {
      ...defaults.folderMappings,
      ...userConfig.folderMappings,
    },
    highRiskFiles: userConfig.highRiskFiles ?? defaults.highRiskFiles,
    lowRiskFiles: userConfig.lowRiskFiles ?? defaults.lowRiskFiles,
    maxDepth: userConfig.maxDepth ?? defaults.maxDepth,
  };
}

/**
 * Validate configuration and return any warnings
 */
export function validateConfig(config: SawrinConfig): string[] {
  const warnings: string[] = [];

  // Validate maxDepth
  if (config.maxDepth !== undefined) {
    if (config.maxDepth < 1 || config.maxDepth > 50) {
      warnings.push("maxDepth should be between 1 and 50");
    }
  }

  // Validate riskWeights
  if (config.riskWeights) {
    for (const [key, value] of Object.entries(config.riskWeights)) {
      if (typeof value !== "number" || value < 0 || value > 10) {
        warnings.push(`riskWeights.${key} should be a number between 0 and 10`);
      }
    }
  }

  return warnings;
}

/**
 * Check if a file path matches any of the ignore patterns
 */
export function shouldIgnoreFile(
  filePath: string,
  config: SawrinConfig,
): boolean {
  const patterns = config.ignorePatterns || [];
  return patterns.some((pattern) => matchGlobPattern(filePath, pattern));
}

/**
 * Check if a file path matches any of the test patterns
 */
export function isConfiguredTestFile(
  filePath: string,
  config: SawrinConfig,
): boolean {
  const patterns = config.testPatterns || [];
  return patterns.some((pattern) => matchGlobPattern(filePath, pattern));
}

/**
 * Check if a file is configured as high risk
 */
export function isHighRiskFile(
  filePath: string,
  config: SawrinConfig,
): boolean {
  const patterns = config.highRiskFiles || [];
  return patterns.some((pattern) => matchGlobPattern(filePath, pattern));
}

/**
 * Check if a file is configured as low risk
 */
export function isLowRiskFile(filePath: string, config: SawrinConfig): boolean {
  const patterns = config.lowRiskFiles || [];
  return patterns.some((pattern) => matchGlobPattern(filePath, pattern));
}

/**
 * Simple glob pattern matching (supports * and **)
 */
function matchGlobPattern(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");

  // Check if pattern starts with **/ (matches any leading path)
  const startsWithGlobstar = normalizedPattern.startsWith("**/");
  const patternToConvert = startsWithGlobstar
    ? normalizedPattern.slice(3)
    : normalizedPattern;

  // Convert glob to regex (escape first, then convert glob chars)
  let regexPattern = patternToConvert
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*\*/g, "§§") // Placeholder for **
    .replace(/\*/g, "[^/]*") // * matches anything except /
    .replace(/§§/g, ".*"); // ** matches anything

  // If original pattern started with **/, allow optional leading path
  if (startsWithGlobstar) {
    regexPattern = "(?:.*/)?" + regexPattern;
  }

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedPath);
}

/**
 * Get effective risk weight for a signal
 */
export function getEffectiveRiskWeight(
  signal: string,
  defaultWeight: number,
  config: SawrinConfig,
): number {
  const overrides = config.riskWeights || {};
  const key = signal as keyof typeof overrides;
  return overrides[key] ?? defaultWeight;
}
