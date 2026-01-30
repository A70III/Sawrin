// ============================================
// Sawrin - Task Parser
// ============================================
// Parse Makefile and Taskfile.yml to detect available tasks

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type {
  TaskDefinition,
  TaskDetectionResult,
  TaskSource,
} from "../types/index.js";

/**
 * Task file names to search for
 */
const MAKEFILE_NAMES = ["Makefile", "makefile", "GNUmakefile"];
const TASKFILE_NAMES = [
  "Taskfile.yml",
  "Taskfile.yaml",
  "taskfile.yml",
  "taskfile.yaml",
];

/**
 * Detect and parse all task files in a project
 */
export async function detectTasks(
  rootPath: string,
): Promise<TaskDetectionResult> {
  const result: TaskDetectionResult = {
    found: false,
    tasks: [],
  };

  // Check for Makefile
  for (const name of MAKEFILE_NAMES) {
    const makePath = resolve(rootPath, name);
    if (existsSync(makePath)) {
      result.found = true;
      result.makefilePath = makePath;
      const content = readFileSync(makePath, "utf-8");
      const tasks = parseMakefile(content, makePath);
      result.tasks.push(...tasks);
      break;
    }
  }

  // Check for Taskfile
  for (const name of TASKFILE_NAMES) {
    const taskPath = resolve(rootPath, name);
    if (existsSync(taskPath)) {
      result.found = true;
      result.taskfilePath = taskPath;
      const content = readFileSync(taskPath, "utf-8");
      const tasks = parseTaskfile(content, taskPath);
      result.tasks.push(...tasks);
      break;
    }
  }

  return result;
}

/**
 * Parse a Makefile and extract targets
 */
export function parseMakefile(
  content: string,
  sourcePath: string,
): TaskDefinition[] {
  const tasks: TaskDefinition[] = [];
  const lines = content.split("\n");

  let currentComment = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track comments that might be descriptions
    if (line.startsWith("#")) {
      currentComment = line.slice(1).trim();
      continue;
    }

    // Match target lines: target: [dependencies]
    // Excludes .PHONY and variable assignments
    const targetMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (targetMatch && !line.includes("=") && !targetMatch[1].startsWith(".")) {
      const name = targetMatch[1];
      const depsString = targetMatch[2].trim();
      const dependencies = depsString
        ? depsString.split(/\s+/).filter(Boolean)
        : [];

      // Collect commands (indented lines following the target)
      const commands: string[] = [];
      let j = i + 1;
      while (
        j < lines.length &&
        (lines[j].startsWith("\t") || lines[j].startsWith("    "))
      ) {
        const cmd = lines[j].replace(/^\t/, "").replace(/^    /, "").trim();
        if (cmd && !cmd.startsWith("#")) {
          commands.push(cmd);
        }
        j++;
      }

      tasks.push({
        name,
        source: "makefile",
        sourcePath,
        description: currentComment || undefined,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
        commands: commands.length > 0 ? commands : undefined,
      });

      currentComment = "";
    } else if (line.trim() !== "") {
      // Reset comment if we hit a non-target, non-comment line
      currentComment = "";
    }
  }

  return tasks;
}

/**
 * Parse a Taskfile.yml and extract tasks
 */
export function parseTaskfile(
  content: string,
  sourcePath: string,
): TaskDefinition[] {
  const tasks: TaskDefinition[] = [];

  // Simple YAML parsing for Taskfile structure
  // Taskfile format:
  // tasks:
  //   task-name:
  //     desc: Description
  //     deps: [dep1, dep2]
  //     cmds:
  //       - command1
  //       - command2

  const lines = content.split("\n");
  let inTasks = false;
  let currentTask: Partial<TaskDefinition> | null = null;
  let currentIndent = 0;
  let inCmds = false;
  let inDeps = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    // Detect 'tasks:' section
    if (trimmed === "tasks:" || trimmed.startsWith("tasks:")) {
      inTasks = true;
      currentIndent = indent;
      continue;
    }

    if (!inTasks) continue;

    // Reserved Taskfile keywords that are NOT task names
    const reservedKeywords = [
      "cmds",
      "deps",
      "desc",
      "summary",
      "vars",
      "env",
      "dir",
      "silent",
      "sources",
      "generates",
      "status",
      "preconditions",
      "method",
      "prefix",
      "ignore_error",
      "run",
    ];

    // Task name line (2-space indent under tasks, must not be a reserved keyword)
    const taskNameMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_:-]*):$/);
    if (
      taskNameMatch &&
      indent > currentIndent &&
      indent <= currentIndent + 4 &&
      !reservedKeywords.includes(taskNameMatch[1])
    ) {
      // Save previous task
      if (currentTask?.name) {
        tasks.push(currentTask as TaskDefinition);
      }

      currentTask = {
        name: taskNameMatch[1],
        source: "taskfile",
        sourcePath,
        commands: [],
        dependencies: [],
      };
      inCmds = false;
      inDeps = false;
      continue;
    }

    if (!currentTask) continue;

    // Parse task properties
    if (trimmed.startsWith("desc:")) {
      currentTask.description = trimmed
        .slice(5)
        .trim()
        .replace(/^['"]|['"]$/g, "");
    } else if (trimmed.startsWith("summary:")) {
      // Alternative description field
      if (!currentTask.description) {
        currentTask.description = trimmed
          .slice(8)
          .trim()
          .replace(/^['"]|['"]$/g, "");
      }
    } else if (trimmed === "cmds:") {
      inCmds = true;
      inDeps = false;
    } else if (trimmed === "deps:") {
      inDeps = true;
      inCmds = false;
    } else if (trimmed.startsWith("- ") && inCmds) {
      const cmd = trimmed.slice(2).trim();
      currentTask.commands = currentTask.commands || [];
      currentTask.commands.push(cmd);
    } else if (trimmed.startsWith("- ") && inDeps) {
      const dep = trimmed.slice(2).trim();
      currentTask.dependencies = currentTask.dependencies || [];
      currentTask.dependencies.push(dep);
    } else if (trimmed.startsWith("deps:") && trimmed.includes("[")) {
      // Inline deps: [dep1, dep2]
      const match = trimmed.match(/deps:\s*\[([^\]]*)\]/);
      if (match) {
        currentTask.dependencies = match[1]
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
      }
    }
  }

  // Don't forget the last task
  if (currentTask?.name) {
    tasks.push(currentTask as TaskDefinition);
  }

  // Clean up empty arrays
  for (const task of tasks) {
    if (task.commands?.length === 0) task.commands = undefined;
    if (task.dependencies?.length === 0) task.dependencies = undefined;
  }

  return tasks;
}

/**
 * Get a specific task by name
 */
export function getTaskByName(
  tasks: TaskDefinition[],
  name: string,
): TaskDefinition | undefined {
  return tasks.find((t) => t.name === name);
}

/**
 * Filter tasks by source type
 */
export function getTasksBySource(
  tasks: TaskDefinition[],
  source: TaskSource,
): TaskDefinition[] {
  return tasks.filter((t) => t.source === source);
}
