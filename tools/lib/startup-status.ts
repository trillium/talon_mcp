import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const STATUS_FILE = join(homedir(), '.talon', 'startup_status.json')
const HISTORY_DIR = join(homedir(), '.talon', 'startup_history')

export interface StartupWarning {
  type: string
  file?: string
  line?: number
  message: string
}

export interface StartupError {
  type: string
  file?: string
  message: string
}

export interface StartupStatus {
  timestamp: string
  error_count: number
  warning_count: number
  errors: StartupError[]
  warnings: StartupWarning[]
  success: boolean
}

export function getStartupStatus(): StartupStatus | null {
  try {
    const content = readFileSync(STATUS_FILE, 'utf-8')
    return JSON.parse(content) as StartupStatus
  } catch {
    return null
  }
}

export function getStartupHistory(limit = 10): StartupStatus[] {
  try {
    const files = readdirSync(HISTORY_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit)

    return files.map((f) => {
      const content = readFileSync(join(HISTORY_DIR, f), 'utf-8')
      return JSON.parse(content) as StartupStatus
    })
  } catch {
    return []
  }
}
