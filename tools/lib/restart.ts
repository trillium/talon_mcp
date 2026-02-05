import { exec } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const TIMESTAMP_FILE = join(homedir(), '.talon', 'launch_timestamp')

export interface StartupError {
  type: 'parse' | 'callback' | 'other'
  file?: string
  message: string
}

export interface StartupWarning {
  type: 'syntax' | 'deprecation' | 'other'
  file?: string
  line?: number
  message: string
}

export interface RestartResult {
  success: boolean
  message: string
  error?: string
  timing?: {
    exitWaitMs: number
    readyWaitMs: number
    speechReadyMs?: number
    totalMs: number
  }
  startup?: {
    errorCount: number
    warningCount: number
    errors: StartupError[]
    warnings: StartupWarning[]
    speechEngineActive: boolean
    microphoneActive: boolean
    speechDetected: boolean
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isTalonRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('pgrep -x Talon')
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

async function waitForTalonExit(timeoutMs = 10000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (!(await isTalonRunning())) {
      return true
    }
    await sleep(200)
  }
  return false
}

function getLaunchTimestamp(): string | null {
  try {
    return readFileSync(TIMESTAMP_FILE, 'utf-8').trim()
  } catch {
    return null
  }
}

async function waitForTimestampChange(
  oldTimestamp: string | null,
  timeoutMs = 30000
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const newTimestamp = getLaunchTimestamp()
    if (newTimestamp && newTimestamp !== oldTimestamp) {
      return true
    }
    await sleep(500)
  }
  return false
}

async function getLogSize(logPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`wc -c < "${logPath}"`)
    return parseInt(stdout.trim(), 10)
  } catch {
    return 0
  }
}

async function getNewLogContent(logPath: string, fromByte: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`tail -c +${fromByte} "${logPath}"`, { timeout: 5000 })
    return stdout
  } catch {
    return ''
  }
}

function parseStartupErrors(logContent: string): StartupError[] {
  const errors: StartupError[] = []
  const lines = logContent.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Parse TalonScript errors: ERROR Failed to parse TalonScript in "file" for "command"
    const parseMatch = line.match(/ERROR Failed to parse TalonScript in "([^"]+)" for "([^"]+)"/)
    if (parseMatch) {
      errors.push({
        type: 'parse',
        file: parseMatch[1],
        message: `Failed to parse command "${parseMatch[2]}"`,
      })
      continue
    }

    // Callback errors: ERROR cb error topic="..." cb=...
    const cbMatch = line.match(/ERROR cb error topic="([^"]+)" cb=(\S+)/)
    if (cbMatch) {
      // Look for the error message on the next few lines
      let errorMsg = `${cbMatch[1]} callback error in ${cbMatch[2]}`
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j]
        if (nextLine.match(/^[A-Z][a-zA-Z]*Error:/)) {
          errorMsg = nextLine.trim()
          break
        }
      }
      errors.push({
        type: 'callback',
        message: errorMsg,
      })
      continue
    }

    // Generic ERROR lines (excluding the summary line)
    if (line.includes('ERROR') && !line.includes('error(s) during startup')) {
      // Skip lines that are part of stack traces
      if (line.match(/^\s+\d+:/) || line.match(/^talon\./)) continue

      const errorMatch = line.match(/ERROR\s+(.+)/)
      if (errorMatch && !errors.some((e) => e.message.includes(errorMatch[1]))) {
        errors.push({
          type: 'other',
          message: errorMatch[1].trim(),
        })
      }
    }
  }

  return errors
}

function parseStartupWarnings(logContent: string): StartupWarning[] {
  const warnings: StartupWarning[] = []
  const lines = logContent.split('\n')

  for (const line of lines) {
    // Python SyntaxWarning: WARNING /path/file.py:123: SyntaxWarning: message
    const syntaxMatch = line.match(/WARNING\s+([^:]+):(\d+):\s+SyntaxWarning:\s+(.+)/)
    if (syntaxMatch) {
      warnings.push({
        type: 'syntax',
        file: syntaxMatch[1],
        line: parseInt(syntaxMatch[2], 10),
        message: syntaxMatch[3].trim(),
      })
      continue
    }

    // Python DeprecationWarning: WARNING /path/file.py:123: DeprecationWarning: message
    const deprecationMatch = line.match(/WARNING\s+([^:]+):(\d+):\s+DeprecationWarning:\s+(.+)/)
    if (deprecationMatch) {
      warnings.push({
        type: 'deprecation',
        file: deprecationMatch[1],
        line: parseInt(deprecationMatch[2], 10),
        message: deprecationMatch[3].trim(),
      })
      continue
    }

    // Generic WARNING lines with file:line format
    const genericFileMatch = line.match(/WARNING\s+([^:]+):(\d+):\s+(\w+Warning):\s+(.+)/)
    if (genericFileMatch) {
      warnings.push({
        type: 'other',
        file: genericFileMatch[1],
        line: parseInt(genericFileMatch[2], 10),
        message: `${genericFileMatch[3]}: ${genericFileMatch[4].trim()}`,
      })
      continue
    }

    // Other WARNING lines (but exclude noise like "warning(s) during startup")
    if (line.includes('WARNING') && !line.includes('warning(s) during startup')) {
      const warnMatch = line.match(/WARNING\s+(.+)/)
      if (warnMatch && !warnings.some((w) => w.message.includes(warnMatch[1]))) {
        warnings.push({
          type: 'other',
          message: warnMatch[1].trim(),
        })
      }
    }
  }

  return warnings
}

interface StartupStats {
  errorCount: number
  warningCount: number
  errors: StartupError[]
  warnings: StartupWarning[]
  speechEngineActive: boolean
  microphoneActive: boolean
}

function parseStartupStats(logContent: string): StartupStats {
  const stats: StartupStats = {
    errorCount: 0,
    warningCount: 0,
    errors: [],
    warnings: [],
    speechEngineActive: false,
    microphoneActive: false,
  }

  // Parse error count: [!] N error(s) during startup
  const errorMatch = logContent.match(/\[!\] (\d+) error\(s\) during startup/)
  if (errorMatch) {
    stats.errorCount = parseInt(errorMatch[1], 10)
  }

  // Parse warning count: [!] N warning(s) during startup
  const warnMatch = logContent.match(/\[!\] (\d+) warning\(s\) during startup/)
  if (warnMatch) {
    stats.warningCount = parseInt(warnMatch[1], 10)
  }

  // Parse individual errors and warnings
  stats.errors = parseStartupErrors(logContent)
  stats.warnings = parseStartupWarnings(logContent)

  // Check for speech engine activation
  stats.speechEngineActive = /\(SpeechSystem\) Activating speech engine:/.test(logContent)

  // Check for microphone activation
  stats.microphoneActive = /Activating Microphone:/.test(logContent)

  return stats
}

async function waitForSpeechDetection(
  logPath: string,
  fromByte: number,
  timeoutMs = 15000
): Promise<boolean> {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const content = await getNewLogContent(logPath, fromByte)

    // Look for speech detection: 🎵 DETECTED: speech
    if (content.includes('DETECTED: speech')) {
      return true
    }

    await sleep(500)
  }
  return false
}

/**
 * Restart Talon by quitting and relaunching.
 * Blocks until Talon is fully ready (detected via timestamp file change),
 * then reports startup errors and speech status.
 */
export async function restartTalon(): Promise<RestartResult> {
  const totalStart = Date.now()
  const logPath = join(homedir(), '.talon', 'talon.log')

  try {
    // Read current timestamp before restart
    const oldTimestamp = getLaunchTimestamp()

    // Get log size before restart for parsing startup errors later
    const initialLogSize = await getLogSize(logPath)

    // Quit Talon gracefully via AppleScript
    await execAsync('osascript -e \'quit app "Talon"\'')

    // Brief pause to let quit signal propagate
    await sleep(500)

    // Wait for Talon to fully exit
    const exitStart = Date.now()
    const exited = await waitForTalonExit(10000)
    const exitWaitMs = Date.now() - exitStart

    if (!exited) {
      return {
        success: false,
        message: 'Talon did not exit within timeout',
      }
    }

    // Buffer after exit to ensure clean state
    await sleep(1000)

    // Relaunch Talon
    await execAsync('open /Applications/Talon.app')

    // Wait for timestamp file to change (confirms Talon is ready)
    const readyStart = Date.now()
    const ready = await waitForTimestampChange(oldTimestamp, 30000)
    const readyWaitMs = Date.now() - readyStart

    if (!ready) {
      return {
        success: false,
        message: 'Talon launched but did not become ready within timeout',
        timing: {
          exitWaitMs,
          readyWaitMs,
          totalMs: Date.now() - totalStart,
        },
      }
    }

    // Get startup log content for analysis
    const startupLogContent = await getNewLogContent(logPath, initialLogSize)
    const startupStats = parseStartupStats(startupLogContent)

    // Wait for speech detection as confirmation speech recognition is working
    const speechStart = Date.now()
    const speechDetected = await waitForSpeechDetection(logPath, initialLogSize, 15000)
    const speechReadyMs = Date.now() - speechStart

    // Build result message
    const parts: string[] = ['Talon has been restarted']
    if (startupStats.errorCount > 0) {
      parts.push(`with ${startupStats.errorCount} error(s)`)
    }
    if (startupStats.warningCount > 0) {
      parts.push(`and ${startupStats.warningCount} warning(s)`)
    }
    if (speechDetected) {
      parts.push('- speech recognition confirmed')
    } else if (startupStats.speechEngineActive && startupStats.microphoneActive) {
      parts.push('- speech engine and microphone active (no speech detected yet)')
    }

    return {
      success: startupStats.errorCount === 0,
      message: parts.join(' '),
      timing: {
        exitWaitMs,
        readyWaitMs,
        speechReadyMs: speechDetected ? speechReadyMs : undefined,
        totalMs: Date.now() - totalStart,
      },
      startup: {
        errorCount: startupStats.errorCount,
        warningCount: startupStats.warningCount,
        errors: startupStats.errors,
        warnings: startupStats.warnings,
        speechEngineActive: startupStats.speechEngineActive,
        microphoneActive: startupStats.microphoneActive,
        speechDetected,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to restart Talon',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
