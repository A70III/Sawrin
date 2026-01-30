// ============================================
// Sawrin - Risk Calculator
// ============================================
// Calculate overall risk level based on change impact

import type {
  RiskAssessment,
  RiskLevel,
  RiskSignal,
  ChangedFile,
  ImpactedFile,
} from "../types/index.js";
import type { Analyzer, AnalyzerContext } from "./base-analyzer.js";
import {
  getFolderRiskLevel,
  getAffectedModules,
} from "../heuristics/folder-conventions.js";
import { isTestFile } from "../heuristics/naming-conventions.js";

/**
 * Risk thresholds
 */
const THRESHOLDS = {
  LOW: 3, // score <= 3 = LOW risk
  MEDIUM: 7, // score <= 7 = MEDIUM risk
  // score > 7 = HIGH risk
};

/**
 * Risk weights for different signals
 */
const WEIGHTS = {
  highRiskFolder: 3,
  mediumRiskFolder: 1,
  authSecurityFile: 4,
  databaseFile: 3,
  configFile: 2,
  sharedUtility: 2,
  multipleModules: 2,
  manyFilesChanged: 1,
  manyTestsImpacted: 1,
  coreFile: 3,
};

/**
 * Risk Calculator Analyzer
 */
export const riskCalculator: Analyzer<RiskAssessment> = {
  name: "risk-calculator",

  async analyze(context: AnalyzerContext): Promise<RiskAssessment> {
    const { changedFiles } = context;
    const signals: RiskSignal[] = [];
    let score = 0;

    // Filter out test files for risk calculation
    const sourceFiles = changedFiles.filter((f) => !isTestFile(f.path));

    if (sourceFiles.length === 0) {
      return {
        level: "LOW",
        score: 0,
        signals: [
          {
            signal: "only_tests",
            weight: 0,
            description: "Only test files were modified",
          },
        ],
        summary: "Low risk: Only test files were modified",
      };
    }

    // 1. Check folder risk levels
    for (const file of sourceFiles) {
      const folderRisk = getFolderRiskLevel(file.path);

      if (folderRisk === "high") {
        signals.push({
          signal: "high_risk_folder",
          weight: WEIGHTS.highRiskFolder,
          description: `High-risk folder: ${file.path}`,
        });
        score += WEIGHTS.highRiskFolder;
      } else if (folderRisk === "medium") {
        signals.push({
          signal: "medium_risk_folder",
          weight: WEIGHTS.mediumRiskFolder,
          description: `Medium-risk folder: ${file.path}`,
        });
        score += WEIGHTS.mediumRiskFolder;
      }
    }

    // 2. Check for auth/security files
    const authPatterns = [
      "auth",
      "security",
      "password",
      "token",
      "jwt",
      "session",
      "login",
      "permission",
    ];
    for (const file of sourceFiles) {
      const lowerPath = file.path.toLowerCase();
      if (authPatterns.some((p) => lowerPath.includes(p))) {
        signals.push({
          signal: "auth_security",
          weight: WEIGHTS.authSecurityFile,
          description: `Authentication/security file modified: ${file.path}`,
        });
        score += WEIGHTS.authSecurityFile;
        break; // Only count once
      }
    }

    // 3. Check for database files
    const dbPatterns = [
      "database",
      "migration",
      "schema",
      "model",
      "entity",
      "repository",
      ".sql",
    ];
    for (const file of sourceFiles) {
      const lowerPath = file.path.toLowerCase();
      if (dbPatterns.some((p) => lowerPath.includes(p))) {
        signals.push({
          signal: "database",
          weight: WEIGHTS.databaseFile,
          description: `Database-related file modified: ${file.path}`,
        });
        score += WEIGHTS.databaseFile;
        break; // Only count once
      }
    }

    // 4. Check for config files
    const configPatterns = ["config", ".env", "settings", "constants"];
    for (const file of sourceFiles) {
      const lowerPath = file.path.toLowerCase();
      if (configPatterns.some((p) => lowerPath.includes(p))) {
        signals.push({
          signal: "config",
          weight: WEIGHTS.configFile,
          description: `Configuration file modified: ${file.path}`,
        });
        score += WEIGHTS.configFile;
        break;
      }
    }

    // 5. Check for shared utilities
    const utilPatterns = ["utils", "helpers", "lib", "shared", "common"];
    for (const file of sourceFiles) {
      const lowerPath = file.path.toLowerCase();
      if (
        utilPatterns.some(
          (p) => lowerPath.includes(`/${p}/`) || lowerPath.includes(`\\${p}\\`),
        )
      ) {
        signals.push({
          signal: "shared_utility",
          weight: WEIGHTS.sharedUtility,
          description: `Shared utility modified: ${file.path}`,
        });
        score += WEIGHTS.sharedUtility;
        break;
      }
    }

    // 6. Check for core files
    const corePatterns = ["core", "kernel", "base", "main", "app"];
    for (const file of sourceFiles) {
      const lowerPath = file.path.toLowerCase();
      const fileName = lowerPath.split(/[/\\]/).pop() || "";
      if (
        corePatterns.some(
          (p) => lowerPath.includes(`/${p}/`) || fileName.startsWith(p),
        )
      ) {
        signals.push({
          signal: "core_file",
          weight: WEIGHTS.coreFile,
          description: `Core file modified: ${file.path}`,
        });
        score += WEIGHTS.coreFile;
        break;
      }
    }

    // 7. Check number of affected modules
    const paths = sourceFiles.map((f) => f.path);
    const affectedModules = getAffectedModules(paths);
    if (affectedModules.size > 1) {
      const additionalModules = affectedModules.size - 1;
      const weight = WEIGHTS.multipleModules * additionalModules;
      signals.push({
        signal: "multiple_modules",
        weight,
        description: `Changes span ${affectedModules.size} modules: ${Array.from(affectedModules).join(", ")}`,
      });
      score += weight;
    }

    // 8. Check number of files changed
    if (sourceFiles.length >= 5) {
      const weight = Math.min(sourceFiles.length - 4, 3);
      signals.push({
        signal: "many_files",
        weight,
        description: `${sourceFiles.length} source files changed`,
      });
      score += weight;
    }

    // Calculate risk level
    let level: RiskLevel;
    if (score <= THRESHOLDS.LOW) {
      level = "LOW";
    } else if (score <= THRESHOLDS.MEDIUM) {
      level = "MEDIUM";
    } else {
      level = "HIGH";
    }

    // Generate summary
    const summary = generateSummary(level, signals);

    return {
      level,
      score,
      signals,
      summary,
    };
  },
};

/**
 * Enhanced risk calculation with test impact
 */
export function calculateRiskWithImpact(
  changedFiles: ChangedFile[],
  impactedUnitTests: ImpactedFile[],
  impactedApiTests: ImpactedFile[],
): RiskAssessment {
  // Start with base calculation
  const baseSignals: RiskSignal[] = [];
  let score = 0;

  const sourceFiles = changedFiles.filter((f) => !isTestFile(f.path));

  // Add test impact signals
  if (impactedUnitTests.length >= 10) {
    const weight = Math.min(Math.floor(impactedUnitTests.length / 5), 3);
    baseSignals.push({
      signal: "many_tests_impacted",
      weight,
      description: `${impactedUnitTests.length} unit tests potentially impacted`,
    });
    score += weight;
  }

  if (impactedApiTests.length >= 5) {
    const weight = Math.min(Math.floor(impactedApiTests.length / 2), 3);
    baseSignals.push({
      signal: "many_api_tests_impacted",
      weight,
      description: `${impactedApiTests.length} API tests potentially impacted`,
    });
    score += weight;
  }

  // Calculate level
  let level: RiskLevel;
  if (score <= THRESHOLDS.LOW) {
    level = "LOW";
  } else if (score <= THRESHOLDS.MEDIUM) {
    level = "MEDIUM";
  } else {
    level = "HIGH";
  }

  return {
    level,
    score,
    signals: baseSignals,
    summary: generateSummary(level, baseSignals),
  };
}

/**
 * Generate human-readable summary
 */
function generateSummary(level: RiskLevel, signals: RiskSignal[]): string {
  if (signals.length === 0) {
    return `${level} risk: No significant risk signals detected`;
  }

  const topSignals = signals
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((s) => s.description.split(":")[0])
    .join(", ");

  return `${level} risk: ${topSignals}`;
}

export default riskCalculator;
