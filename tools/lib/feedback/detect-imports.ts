import { UNNECESSARY_TALON_IMPORT } from './messages'

/**
 * Detects unnecessary talon imports in code.
 * The Talon REPL already has talon modules available, so importing them is redundant.
 */
export function detectUnnecessaryTalonImports(code: string): string | undefined {
  const importPatterns = [/^import\s+talon\b/m, /^from\s+talon\b.*\s+import\b/m]

  const hasUnnecessaryImport = importPatterns.some((pattern) => pattern.test(code))

  if (hasUnnecessaryImport) {
    return UNNECESSARY_TALON_IMPORT
  }

  return undefined
}
