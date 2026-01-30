#!/usr/bin/env node
// ============================================
// Sawrin - Main Entry Point
// ============================================
// CLI tool for analyzing git diff impact on tests

import { resolve } from "path";
import { glob } from "glob";
import { parseArgs } from "./cli/commands.js";
import { parseDiff, parseNameStatus } from "./core/diff-parser.js";
import {
  getDiff,
  getDiffNameStatus,
  isGitRepository,
  getGitRoot,
} from "./core/git.js";
import { buildDependencyGraph } from "./core/dependency-graph.js";
import { unitTestAnalyzer } from "./analyzers/unit-test-analyzer.js";
import { apiTestAnalyzer } from "./analyzers/api-test-analyzer.js";
import {
  riskCalculator,
  calculateRiskWithImpact,
} from "./analyzers/risk-calculator.js";
import {
  printReport,
  printJsonReport,
  printError,
  printWarning,
} from "./reporter/cli-reporter.js";
import type { AnalysisResult, ChangedFile } from "./types/index.js";

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Parse CLI arguments
    const options = parseArgs();

    // Check if in git repository
    if (!isGitRepository()) {
      printError("Not in a git repository");
      process.exit(1);
    }

    const projectRoot = getGitRoot();

    // Get diff
    let changedFiles: ChangedFile[];

    // Try fast name-status first, fall back to full diff
    const nameStatusOutput = getDiffNameStatus({
      base: options.base,
      head: options.head,
    });

    if (nameStatusOutput.trim()) {
      changedFiles = parseNameStatus(nameStatusOutput);
    } else {
      const diffOutput = getDiff({
        base: options.base,
        head: options.head,
      });
      changedFiles = parseDiff(diffOutput);
    }

    if (changedFiles.length === 0) {
      printWarning("No changes detected");
      process.exit(0);
    }

    // Get all files in project
    const allFiles = await glob("**/*.{ts,tsx,js,jsx}", {
      cwd: projectRoot,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    });

    // Build dependency graph
    const dependencyGraph = await buildDependencyGraph(projectRoot);

    // Create analyzer context
    const context = {
      changedFiles,
      dependencyGraph,
      projectRoot,
      allFiles,
    };

    // Run analyzers
    const impactedUnitTests = await unitTestAnalyzer.analyze(context);
    const impactedApiTests = await apiTestAnalyzer.analyze(context);

    // Calculate risk (with enhanced calculation including test impact)
    const baseRisk = await riskCalculator.analyze(context);
    const enhancedRisk = calculateRiskWithImpact(
      changedFiles,
      impactedUnitTests,
      impactedApiTests,
    );

    // Merge risk signals
    const finalRisk = {
      level: Math.max(
        riskLevelToNumber(baseRisk.level),
        riskLevelToNumber(enhancedRisk.level),
      ) as 0 | 1 | 2,
      score: baseRisk.score + enhancedRisk.score,
      signals: [...baseRisk.signals, ...enhancedRisk.signals],
      summary:
        baseRisk.score >= enhancedRisk.score
          ? baseRisk.summary
          : enhancedRisk.summary,
    };

    // Compile result
    const result: AnalysisResult = {
      changedFiles,
      impactedUnitTests,
      impactedApiTests,
      risk: {
        level: numberToRiskLevel(finalRisk.level),
        score: finalRisk.score,
        signals: finalRisk.signals,
        summary: finalRisk.summary,
      },
      timestamp: new Date(),
    };

    // Output result
    if (options.json) {
      printJsonReport(result);
    } else if (options.interactive) {
      // Lazy load interactive module
      const { interactiveTestSelection } = await import("./cli/interactive.js");
      await interactiveTestSelection(impactedUnitTests, impactedApiTests);
    } else {
      printReport(result, options.verbose);
    }
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Convert risk level to number for comparison
 */
function riskLevelToNumber(level: "LOW" | "MEDIUM" | "HIGH"): 0 | 1 | 2 {
  switch (level) {
    case "LOW":
      return 0;
    case "MEDIUM":
      return 1;
    case "HIGH":
      return 2;
  }
}

/**
 * Convert number back to risk level
 */
function numberToRiskLevel(num: 0 | 1 | 2): "LOW" | "MEDIUM" | "HIGH" {
  switch (num) {
    case 0:
      return "LOW";
    case 1:
      return "MEDIUM";
    case 2:
      return "HIGH";
  }
}

// Run main
main();
