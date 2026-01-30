// ============================================
// Sawrin - Task Parser Tests
// ============================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import {
  detectTasks,
  parseMakefile,
  parseTaskfile,
  getTaskByName,
  getTasksBySource,
} from "../src/core/task-parser.js";

const TEST_DIR = resolve(process.cwd(), "tests/fixtures/task-parser-test");

describe("Task Parser", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("parseMakefile", () => {
    it("should parse simple targets", () => {
      const content = `
build:
	npm run build

test:
	npm test
`;
      const tasks = parseMakefile(content, "/path/Makefile");

      expect(tasks.length).toBe(2);
      expect(tasks[0].name).toBe("build");
      expect(tasks[0].source).toBe("makefile");
      expect(tasks[0].commands).toContain("npm run build");
      expect(tasks[1].name).toBe("test");
    });

    it("should parse targets with dependencies", () => {
      const content = `
all: build test

build:
	npm run build

test: build
	npm test
`;
      const tasks = parseMakefile(content, "/path/Makefile");

      const allTask = tasks.find((t) => t.name === "all");
      expect(allTask?.dependencies).toContain("build");
      expect(allTask?.dependencies).toContain("test");

      const testTask = tasks.find((t) => t.name === "test");
      expect(testTask?.dependencies).toContain("build");
    });

    it("should capture comments as descriptions", () => {
      const content = `
# Build the project
build:
	npm run build

# Run all tests
test:
	npm test
`;
      const tasks = parseMakefile(content, "/path/Makefile");

      expect(tasks[0].description).toBe("Build the project");
      expect(tasks[1].description).toBe("Run all tests");
    });

    it("should ignore .PHONY and variable assignments", () => {
      const content = `
.PHONY: build test

VERSION = 1.0.0

build:
	npm run build
`;
      const tasks = parseMakefile(content, "/path/Makefile");

      expect(tasks.length).toBe(1);
      expect(tasks[0].name).toBe("build");
    });
  });

  describe("parseTaskfile", () => {
    it("should parse simple tasks", () => {
      const content = `
version: '3'

tasks:
  build:
    cmds:
      - npm run build

  test:
    cmds:
      - npm test
`;
      const tasks = parseTaskfile(content, "/path/Taskfile.yml");

      expect(tasks.length).toBe(2);
      expect(tasks[0].name).toBe("build");
      expect(tasks[0].source).toBe("taskfile");
      expect(tasks[0].commands).toContain("npm run build");
    });

    it("should parse tasks with descriptions", () => {
      const content = `
version: '3'

tasks:
  build:
    desc: Build the project
    cmds:
      - npm run build
`;
      const tasks = parseTaskfile(content, "/path/Taskfile.yml");

      expect(tasks[0].description).toBe("Build the project");
    });

    it("should parse tasks with dependencies", () => {
      const content = `
version: '3'

tasks:
  all:
    deps:
      - build
      - test
    cmds:
      - echo done

  build:
    cmds:
      - npm run build

  test:
    deps: [build]
    cmds:
      - npm test
`;
      const tasks = parseTaskfile(content, "/path/Taskfile.yml");

      const allTask = tasks.find((t) => t.name === "all");
      expect(allTask?.dependencies).toContain("build");
      expect(allTask?.dependencies).toContain("test");

      const testTask = tasks.find((t) => t.name === "test");
      expect(testTask?.dependencies).toContain("build");
    });
  });

  describe("detectTasks", () => {
    it("should detect Makefile", async () => {
      writeFileSync(resolve(TEST_DIR, "Makefile"), "build:\n\tnpm run build\n");

      const result = await detectTasks(TEST_DIR);

      expect(result.found).toBe(true);
      expect(result.makefilePath).toContain("Makefile");
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it("should detect Taskfile.yml", async () => {
      writeFileSync(
        resolve(TEST_DIR, "Taskfile.yml"),
        'version: "3"\ntasks:\n  build:\n    cmds:\n      - npm run build\n',
      );

      const result = await detectTasks(TEST_DIR);

      expect(result.found).toBe(true);
      expect(result.taskfilePath).toContain("Taskfile.yml");
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it("should detect both Makefile and Taskfile", async () => {
      writeFileSync(resolve(TEST_DIR, "Makefile"), "build:\n\techo make\n");
      writeFileSync(
        resolve(TEST_DIR, "Taskfile.yml"),
        'version: "3"\ntasks:\n  deploy:\n    cmds:\n      - echo task\n',
      );

      const result = await detectTasks(TEST_DIR);

      expect(result.found).toBe(true);
      expect(result.makefilePath).toBeDefined();
      expect(result.taskfilePath).toBeDefined();
      expect(result.tasks.length).toBe(2);
    });

    it("should return found: false when no task files exist", async () => {
      const result = await detectTasks(TEST_DIR);

      expect(result.found).toBe(false);
      expect(result.tasks).toEqual([]);
    });
  });

  describe("helper functions", () => {
    it("getTaskByName should find task by name", () => {
      const tasks = [
        { name: "build", source: "makefile" as const, sourcePath: "/Makefile" },
        { name: "test", source: "makefile" as const, sourcePath: "/Makefile" },
      ];

      const task = getTaskByName(tasks, "build");
      expect(task?.name).toBe("build");

      const notFound = getTaskByName(tasks, "deploy");
      expect(notFound).toBeUndefined();
    });

    it("getTasksBySource should filter by source", () => {
      const tasks = [
        { name: "build", source: "makefile" as const, sourcePath: "/Makefile" },
        {
          name: "deploy",
          source: "taskfile" as const,
          sourcePath: "/Taskfile.yml",
        },
      ];

      const makefileTasks = getTasksBySource(tasks, "makefile");
      expect(makefileTasks.length).toBe(1);
      expect(makefileTasks[0].name).toBe("build");

      const taskfileTasks = getTasksBySource(tasks, "taskfile");
      expect(taskfileTasks.length).toBe(1);
      expect(taskfileTasks[0].name).toBe("deploy");
    });
  });
});
