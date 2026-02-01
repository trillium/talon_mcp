import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface RestartResult {
  success: boolean
  message: string
  error?: string
}

/**
 * Restart Talon by quitting and relaunching
 */
export async function restartTalon(): Promise<RestartResult> {
  try {
    // Quit Talon gracefully via AppleScript
    await execAsync('osascript -e \'quit app "Talon"\'')

    // Wait for Talon to fully quit
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Relaunch Talon
    await execAsync('open /Applications/Talon.app')

    return {
      success: true,
      message: 'Talon has been restarted',
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to restart Talon',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
