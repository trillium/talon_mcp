import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { getTalonConfig } from './config'

interface LogResult {
  success: boolean
  lineCount?: number
  totalLines?: number
  logs?: string
  error?: string
}

async function readLogFile(): Promise<
  { success: true; lines: string[] } | { success: false; error: string }
> {
  const config = getTalonConfig()

  if (!existsSync(config.logPath)) {
    return { success: false, error: `Log file not found at ${config.logPath}` }
  }

  try {
    const content = await readFile(config.logPath, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim())
    return { success: true, lines }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error reading logs',
    }
  }
}

function formatResult(lines: string[], totalLines: number): LogResult {
  return {
    success: true,
    lineCount: lines.length,
    totalLines,
    logs: lines.join('\n'),
  }
}

// --- Tool: Get Recent Logs ---

export interface GetRecentLogsParams {
  lines?: number
}

export async function getRecentLogs(params: GetRecentLogsParams = {}): Promise<string> {
  const { lines = 100 } = params
  const result = await readLogFile()

  if (!result.success) {
    return JSON.stringify({ success: false, error: result.error })
  }

  const recentLines = result.lines.slice(-lines)
  return JSON.stringify(formatResult(recentLines, result.lines.length))
}

// --- Tool: Get Logs by Regex ---

export interface GetLogsRegexParams {
  pattern: string
  lines?: number
  flags?: string
}

export async function getLogsRegex(params: GetLogsRegexParams): Promise<string> {
  const { pattern, lines = 100, flags = 'i' } = params
  const result = await readLogFile()

  if (!result.success) {
    return JSON.stringify({ success: false, error: result.error })
  }

  let regex: RegExp
  try {
    regex = new RegExp(pattern, flags)
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  const matchingLines = result.lines.filter((line) => regex.test(line))
  const recentMatches = matchingLines.slice(-lines)

  return JSON.stringify({
    ...formatResult(recentMatches, matchingLines.length),
    pattern,
    flags,
  })
}

// --- Tool: Get Logs by Query ---

export interface GetLogsQueryParams {
  query: string
  lines?: number
  caseSensitive?: boolean
}

export async function getLogsQuery(params: GetLogsQueryParams): Promise<string> {
  const { query, lines = 100, caseSensitive = false } = params
  const result = await readLogFile()

  if (!result.success) {
    return JSON.stringify({ success: false, error: result.error })
  }

  const searchTerm = caseSensitive ? query : query.toLowerCase()
  const matchingLines = result.lines.filter((line) => {
    const compareLine = caseSensitive ? line : line.toLowerCase()
    return compareLine.includes(searchTerm)
  })
  const recentMatches = matchingLines.slice(-lines)

  return JSON.stringify({
    ...formatResult(recentMatches, matchingLines.length),
    query,
    caseSensitive,
  })
}
