// ============================================
// Sawrin - Interactive Selection Mode
// ============================================
// Allow users to select and run impacted tests interactively

import { checkbox, confirm } from "@inquirer/prompts";
import { spawn } from "child_process";
import type { ImpactedFile } from "../types/index.js";

/**
 * Display impacted tests and allow user to select which to run
 */
export async function interactiveTestSelection(
  unitTests: ImpactedFile[],
  apiTests: ImpactedFile[],
): Promise<void> {
  console.log("\n🔍 Sawrin Interactive Mode\n");

  if (unitTests.length === 0 && apiTests.length === 0) {
    console.log("✅ No impacted tests found. Nothing to run.");
    return;
  }

  // Prepare choices for unit tests
  const unitChoices = unitTests.map((test) => {
    // Calculate simple confidence (mock logic: >1 reasons = 90%, else 60%)
    const confidence = test.reasons.length > 1 ? 90 : 60;
    const reasonText = test.reasons.map((r) => r.type).join(", ");
    return {
      name: `${test.path} (${confidence}% - ${reasonText})`,
      value: test.path,
      checked: confidence >= 80,
    };
  });

  // Prepare choices for API tests
  const apiChoices = apiTests.map((test) => {
    const confidence = test.reasons.length > 1 ? 90 : 60;
    const reasonText = test.reasons.map((r) => r.type).join(", ");
    return {
      name: `${test.path} (${confidence}% - ${reasonText})`,
      value: test.path,
      checked: confidence >= 80,
    };
  });

  const selectedTests: string[] = [];

  // Unit test selection
  if (unitChoices.length > 0) {
    console.log(`\n📋 Found ${unitChoices.length} impacted unit tests:\n`);
    const selected = await checkbox({
      message: "Select unit tests to run:",
      choices: unitChoices,
      pageSize: 15,
    });
    selectedTests.push(...selected);
  }

  // API test selection
  if (apiChoices.length > 0) {
    console.log(`\n📋 Found ${apiChoices.length} impacted API tests:\n`);
    const selected = await checkbox({
      message: "Select API tests to run:",
      choices: apiChoices,
      pageSize: 15,
    });
    selectedTests.push(...selected);
  }

  if (selectedTests.length === 0) {
    console.log("\n❌ No tests selected.");
    return;
  }

  // Confirm before running
  console.log(`\n📝 Selected ${selectedTests.length} test(s):`);
  selectedTests.forEach((t) => console.log(`   - ${t}`));

  const shouldRun = await confirm({
    message: `Run ${selectedTests.length} test(s) now?`,
    default: true,
  });

  if (!shouldRun) {
    console.log("\n⏸️  Test run cancelled.");
    return;
  }

  // Run selected tests
  await runTests(selectedTests);
}

/**
 * Run selected tests using vitest
 */
async function runTests(testPaths: string[]): Promise<void> {
  console.log("\n🚀 Running tests...\n");

  // Filter to only .test. or .spec. files for vitest
  const vitestFiles = testPaths.filter(
    (p) => p.includes(".test.") || p.includes(".spec."),
  );
  const brunoFiles = testPaths.filter((p) => p.endsWith(".bru"));

  // Run vitest for unit tests
  if (vitestFiles.length > 0) {
    console.log("📦 Running unit tests with Vitest...\n");
    await runCommand("npx", ["vitest", "run", ...vitestFiles]);
  }

  // For Bruno tests, just output the command
  if (brunoFiles.length > 0) {
    console.log("\n📡 Bruno API tests to run:");
    brunoFiles.forEach((f) => {
      console.log(`   npx bru run "${f}"`);
    });
  }
}

/**
 * Run a command and stream output
 */
function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      resolve(code ?? 0);
    });

    proc.on("error", (err) => {
      console.error(`Error running command: ${err.message}`);
      resolve(1);
    });
  });
}

/**
 * Simple non-interactive mode: just list tests
 */
export function listImpactedTests(
  unitTests: ImpactedFile[],
  apiTests: ImpactedFile[],
): void {
  console.log("\n📋 Impacted Tests Summary\n");

  if (unitTests.length > 0) {
    console.log("Unit Tests:");
    unitTests.forEach((t) => {
      const confidence = t.reasons.length > 1 ? 90 : 60;
      const icon = confidence >= 80 ? "🔴" : confidence >= 50 ? "🟡" : "🟢";
      console.log(`  ${icon} ${t.path} (${confidence}%)`);
    });
  }

  if (apiTests.length > 0) {
    console.log("\nAPI Tests:");
    apiTests.forEach((t) => {
      const confidence = t.reasons.length > 1 ? 90 : 60;
      const icon = confidence >= 80 ? "🔴" : confidence >= 50 ? "🟡" : "🟢";
      console.log(`  ${icon} ${t.path} (${confidence}%)`);
    });
  }

  if (unitTests.length === 0 && apiTests.length === 0) {
    console.log("✅ No impacted tests found.");
  }
}
