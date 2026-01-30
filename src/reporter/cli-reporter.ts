// ============================================
// Sawrin - CLI Reporter
// ============================================
// Format and display analysis results

import chalk from "chalk";
import type {
  AnalysisResult,
  ImpactedFile,
  RiskLevel,
} from "../types/index.js";

/**
 * Format and print the analysis result to console
 */
export function printReport(
  result: AnalysisResult,
  verbose: boolean = false,
): void {
  console.log();
  console.log(chalk.bold.cyan("🔍 Change Impact Summary"));
  console.log(chalk.gray("─".repeat(50)));
  console.log();

  // Changed Files
  printSection(
    "Changed Files",
    result.changedFiles.map((f) => {
      const icon = getChangeIcon(f.changeType);
      return `${icon} ${f.path}`;
    }),
  );

  // Impacted Unit Tests
  if (result.impactedUnitTests.length > 0) {
    console.log();
    console.log(
      chalk.bold.yellow(
        `📋 Impacted Unit Tests (${result.impactedUnitTests.length})`,
      ),
    );
    for (const test of result.impactedUnitTests) {
      console.log(`  ${chalk.yellow("•")} ${test.path}`);
      if (verbose) {
        for (const reason of test.reasons) {
          console.log(`    ${chalk.gray("→")} ${reason.description}`);
        }
      } else if (test.reasons.length > 0) {
        console.log(`    ${chalk.gray("→")} ${test.reasons[0].description}`);
      }
    }
  } else {
    console.log();
    console.log(chalk.gray("📋 No unit tests impacted"));
  }

  // Impacted API Tests
  if (result.impactedApiTests.length > 0) {
    console.log();
    console.log(
      chalk.bold.magenta(
        `🌐 Impacted API Tests - Bruno (${result.impactedApiTests.length})`,
      ),
    );
    for (const test of result.impactedApiTests) {
      console.log(`  ${chalk.magenta("•")} ${test.path}`);
      if (verbose) {
        for (const reason of test.reasons) {
          console.log(`    ${chalk.gray("→")} ${reason.description}`);
        }
      } else if (test.reasons.length > 0) {
        console.log(`    ${chalk.gray("→")} ${test.reasons[0].description}`);
      }
    }
  } else {
    console.log();
    console.log(chalk.gray("🌐 No Bruno API tests impacted"));
  }

  // Risk Level
  console.log();
  console.log(chalk.gray("─".repeat(50)));
  printRiskLevel(result.risk.level);
  console.log();
  console.log(chalk.bold("Reason:"));
  if (result.risk.signals.length > 0) {
    for (const signal of result.risk.signals.slice(0, 5)) {
      console.log(`  ${chalk.gray("•")} ${signal.description}`);
    }
  } else {
    console.log(`  ${chalk.gray("•")} No significant risk signals detected`);
  }

  console.log();
}

/**
 * Print a section with items
 */
function printSection(title: string, items: string[]): void {
  console.log(chalk.bold.white(`📁 ${title} (${items.length})`));
  for (const item of items) {
    console.log(`  ${item}`);
  }
}

/**
 * Get icon for change type
 */
function getChangeIcon(changeType: string): string {
  switch (changeType) {
    case "added":
      return chalk.green("+");
    case "deleted":
      return chalk.red("-");
    case "renamed":
      return chalk.blue("→");
    default:
      return chalk.yellow("~");
  }
}

/**
 * Print risk level with appropriate color
 */
function printRiskLevel(level: RiskLevel): void {
  const riskColors = {
    LOW: chalk.green,
    MEDIUM: chalk.yellow,
    HIGH: chalk.red,
  };

  const riskEmojis = {
    LOW: "✅",
    MEDIUM: "⚠️",
    HIGH: "🚨",
  };

  const color = riskColors[level];
  const emoji = riskEmojis[level];

  console.log(color.bold(`${emoji} Risk Level: ${level}`));
}

/**
 * Print result as JSON
 */
export function printJsonReport(result: AnalysisResult): void {
  const output = {
    changedFiles: result.changedFiles,
    impactedUnitTests: result.impactedUnitTests.map(simplifyImpacted),
    impactedApiTests: result.impactedApiTests.map(simplifyImpacted),
    risk: {
      level: result.risk.level,
      score: result.risk.score,
      summary: result.risk.summary,
      signals: result.risk.signals.map((s) => s.description),
    },
    timestamp: result.timestamp.toISOString(),
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Simplify impacted file for JSON output
 */
function simplifyImpacted(file: ImpactedFile): object {
  return {
    path: file.path,
    reasons: file.reasons.map((r) => ({
      type: r.type,
      description: r.description,
      relatedFile: r.relatedFile,
    })),
  };
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.error(chalk.red(`❌ Error: ${message}`));
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.warn(chalk.yellow(`⚠️  Warning: ${message}`));
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(chalk.blue(`ℹ️  ${message}`));
}
