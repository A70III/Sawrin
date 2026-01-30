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
