import { exec } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface RestartResult {
  success: boolean
  message: string
  error?: string
}

function getReplPath(): string {
  return process.env.TALON_REPL_PATH || join(homedir(), '.talon', '.venv', 'bin', 'repl')
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

async function waitForTalonReady(timeoutMs = 30000): Promise<boolean> {
  const start = Date.now()
  const replPath = getReplPath()

  while (Date.now() - start < timeoutMs) {
    try {
      // Try a simple REPL command to verify Talon is ready
      await execAsync(`echo 'print("ready")' | "${replPath}"`, { timeout: 5000 })
      return true
    } catch {
      await sleep(500)
    }
  }
  return false
}

/**
 * Restart Talon by quitting and relaunching.
 * Blocks until Talon is fully ready (REPL responds).
 */
export async function restartTalon(): Promise<RestartResult> {
  try {
    // Quit Talon gracefully via AppleScript
    await execAsync('osascript -e \'quit app "Talon"\'')

    // Wait for Talon to fully exit
    const exited = await waitForTalonExit(10000)
    if (!exited) {
      return {
        success: false,
        message: 'Talon did not exit within timeout',
      }
    }

    // Small buffer after exit
    await sleep(500)

    // Relaunch Talon
    await execAsync('open /Applications/Talon.app')

    // Wait for Talon to be ready (REPL responds)
    const ready = await waitForTalonReady(30000)
    if (!ready) {
      return {
        success: false,
        message: 'Talon launched but did not become ready within timeout',
      }
    }

    return {
      success: true,
      message: 'Talon has been restarted and is ready',
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to restart Talon',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
