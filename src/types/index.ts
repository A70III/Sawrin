// ============================================
// Sawrin - Type Definitions
// ============================================

/**
 * Represents a file changed in a git diff
 */
export interface ChangedFile {
  path: string;
  changeType: "added" | "modified" | "deleted" | "renamed";
  oldPath?: string; // For renamed files
}

/**
 * Options for retrieving git diff
 */
export interface GitDiffOptions {
  base?: string; // Base commit/branch (e.g., "main", "HEAD~1")
  head?: string; // Head commit (e.g., "HEAD")
  staged?: boolean; // Compare staged changes
}

/**
 * Represents the dependency graph of a project
 */
export interface DependencyGraph {
  /** Map of file path -> files it imports */
  imports: Map<string, Set<string>>;
  /** Map of file path -> files that import it */
  importedBy: Map<string, Set<string>>;
  /** Map of file path -> exports it provides */
  exports: Map<string, Set<string>>;
}

/**
 * Reason why a file is impacted
 */
export interface ImpactReason {
  type:
    | "direct_change" // The file itself was changed
    | "imports_changed" // File imports a changed file
    | "naming_convention" // Matched via naming convention (e.g., *.spec.ts)
    | "folder_convention" // Co-located in same folder
    | "route_match" // API route matches
    | "tag_match"; // Bruno tag matches
  description: string;
  relatedFile?: string; // The file that caused this impact
}

/**
 * An impacted file with reasons
 */
export interface ImpactedFile {
  path: string;
  reasons: ImpactReason[];
}

/**
 * Risk level of the change
 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Signals that contribute to risk calculation
 */
export interface RiskSignal {
  signal: string;
  weight: number;
  description: string;
}

/**
 * Result of risk calculation
 */
export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  signals: RiskSignal[];
  summary: string;
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  changedFiles: ChangedFile[];
  impactedUnitTests: ImpactedFile[];
  impactedApiTests: ImpactedFile[];
  risk: RiskAssessment;
  timestamp: Date;
}

/**
 * CLI options
 */
export interface CliOptions {
  base?: string;
  head?: string;
  brunoPath?: string;
  verbose?: boolean;
  json?: boolean;
  interactive?: boolean;
  noCache?: boolean;
  clearCache?: boolean;
}

/**
 * Detected API route from source code
 */
export interface DetectedRoute {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ALL";
  path: string;
  sourceFile: string;
  lineNumber?: number;
}

/**
 * Bruno test file metadata
 */
export interface BrunoTestFile {
  path: string;
  method?: string;
  url?: string;
  tags?: string[];
  folder: string;
}

// ============================================
// Monorepo Types
// ============================================

/**
 * Represents a workspace/package in a monorepo
 */
export interface Workspace {
  /** Package name from package.json (e.g., @app/utils) */
  name: string;
  /** Absolute path to the package directory */
  path: string;
  /** Relative path from monorepo root */
  relativePath: string;
  /** Dependencies on other internal packages */
  internalDependencies: string[];
  /** Packages that depend on this one */
  dependedBy: string[];
}

/**
 * Information about a package.json
 */
export interface PackageInfo {
  name: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  main?: string;
  module?: string;
  exports?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

/**
 * Monorepo configuration and structure
 */
export interface MonorepoInfo {
  /** Whether this is a monorepo */
  isMonorepo: boolean;
  /** Root path of the monorepo */
  rootPath: string;
  /** Type of monorepo (npm, pnpm, lerna, nx, turbo) */
  type: "npm" | "pnpm" | "lerna" | "nx" | "turbo" | "unknown";
  /** All workspaces/packages */
  workspaces: Workspace[];
  /** Map of package name -> Workspace */
  packageMap: Map<string, Workspace>;
}

// ============================================
// Configuration Types
// ============================================

/**
 * Custom risk weight overrides
 */
export interface RiskWeightOverrides {
  authSecurityFile?: number;
  databaseFile?: number;
  configFile?: number;
  sharedUtility?: number;
  coreFile?: number;
  crossPackageChange?: number;
}

/**
 * Sawrin configuration file structure
 */
export interface SawrinConfig {
  /** Glob patterns for files to ignore during analysis */
  ignorePatterns?: string[];
  /** Glob patterns for test files (override default detection) */
  testPatterns?: string[];
  /** Path to Bruno collection directory */
  brunoPath?: string;
  /** Custom risk weight overrides */
  riskWeights?: RiskWeightOverrides;
  /** Folder path mappings (for non-standard structures) */
  folderMappings?: Record<string, string>;
  /** Files/patterns to always consider high risk */
  highRiskFiles?: string[];
  /** Files/patterns to always consider low risk */
  lowRiskFiles?: string[];
  /** Maximum depth for dependency traversal */
  maxDepth?: number;
}

// ============================================
// Task Runner Types (Makefile / Taskfile)
// ============================================

/**
 * Source of a task definition
 */
export type TaskSource = "makefile" | "taskfile";

/**
 * A task/target from Makefile or Taskfile
 */
export interface TaskDefinition {
  /** Task/target name */
  name: string;
  /** Source file type */
  source: TaskSource;
  /** Path to the source file */
  sourcePath: string;
  /** Description/comment if available */
  description?: string;
  /** Dependencies (other tasks this depends on) */
  dependencies?: string[];
  /** The command(s) to run */
  commands?: string[];
}

/**
 * Result of task detection
 */
export interface TaskDetectionResult {
  /** Whether any task files were found */
  found: boolean;
  /** Path to Makefile if found */
  makefilePath?: string;
  /** Path to Taskfile if found */
  taskfilePath?: string;
  /** All detected tasks */
  tasks: TaskDefinition[];
}
