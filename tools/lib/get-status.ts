import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { TalonStatus } from './types'

const execAsync = promisify(exec)

export async function getStatus(): Promise<string> {
  try {
    // Check if Talon process is running
    const { stdout } = await execAsync('pgrep -f "Talon" || true')
    const isRunning = stdout.trim().length > 0

    const status: TalonStatus = {
      running: isRunning,
    }

    return JSON.stringify({
      success: true,
      status,
    })
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking status',
    })
  }
}
