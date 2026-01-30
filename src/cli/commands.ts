// ============================================
// Sawrin - CLI Commands
// ============================================
// Command-line argument parsing using Commander

import { Command } from "commander";
import type { CliOptions } from "../types/index.js";

/**
 * Create and configure the CLI program
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("sawrin")
    .description(
      "Heuristic-based diff impact analyzer for TypeScript/Node.js projects",
    )
    .version("0.1.0");

  program
    .option(
      "-b, --base <ref>",
      "Base commit/branch to compare from (e.g., main, HEAD~1)",
    )
    .option("-h, --head <ref>", "Head commit to compare to (default: HEAD)")
    .option("--bruno <path>", "Path to Bruno collection directory")
    .option("-v, --verbose", "Show detailed output with all reasons")
    .option("--json", "Output results as JSON")
    .option("--staged", "Analyze staged changes only");

  return program;
}

/**
 * Parse CLI arguments and return options
 */
export function parseArgs(argv: string[] = process.argv): CliOptions {
  const program = createProgram();
  program.parse(argv);

  const opts = program.opts();

  return {
    base: opts.base,
    head: opts.head,
    brunoPath: opts.bruno,
    verbose: opts.verbose || false,
    json: opts.json || false,
  };
}

/**
 * Show help text
 */
export function showHelp(): void {
  const program = createProgram();
  program.outputHelp();
}
