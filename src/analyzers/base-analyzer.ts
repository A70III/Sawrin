// ============================================
// Sawrin - Base Analyzer Interface
// ============================================

import type {
  ChangedFile,
  DependencyGraph,
  ImpactedFile,
  SawrinConfig,
} from "../types/index.js";

/**
 * Context passed to all analyzers
 */
export interface AnalyzerContext {
  changedFiles: ChangedFile[];
  dependencyGraph: DependencyGraph;
  projectRoot: string;
  allFiles: string[];
  config: SawrinConfig;
}

/**
 * Base interface for all analyzers
 */
export interface Analyzer<T = ImpactedFile[]> {
  name: string;
  analyze(context: AnalyzerContext): Promise<T>;
}
