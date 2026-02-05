import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface UpgradeKnausjResult {
  success: boolean
  output: string
  hasConflicts: boolean
  message: string
}

/**
 * Run the upgrade-knausj CLI tool to upgrade Talon community scripts fork.
 *
 * The upstream repo is talonhub/community (https://github.com/talonhub/community),
 * formerly known as knausj_talon/knausj.
 *
 * The tool:
 * 1. Clones a clean copy of user files from GitHub
 * 2. Attempts git merge with latest upstream community
 * 3. Handles autoformatting commits specially
 *
 * If merge conflicts occur, the user must resolve them manually and re-run.
 */
export async function runUpgradeKnausj(): Promise<string> {
  const toolPath = join(homedir(), '.local', 'bin', 'upgrade-knausj')

  return new Promise((resolve) => {
    const chunks: string[] = []
    const child = spawn(toolPath, [], {
      env: { ...process.env, TERM: 'dumb' },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdout.on('data', (data: Buffer) => {
      chunks.push(data.toString())
    })

    child.stderr.on('data', (data: Buffer) => {
      chunks.push(data.toString())
    })

    child.on('error', (error) => {
      const result: UpgradeKnausjResult = {
        success: false,
        output: '',
        hasConflicts: false,
        message: `Failed to run upgrade-knausj: ${error.message}`,
      }
      resolve(JSON.stringify(result, null, 2))
    })

    child.on('close', (code) => {
      const output = chunks.join('')
      const hasConflicts = output.includes('CONFLICT') || output.includes('merge conflict')

      const result: UpgradeKnausjResult = {
        success: code === 0 && !hasConflicts,
        output,
        hasConflicts,
        message: hasConflicts
          ? 'Merge conflicts detected. Resolve conflicts, commit, then re-run upgrade-knausj.'
          : code === 0
            ? 'Upgrade completed successfully.'
            : `Upgrade failed with exit code ${code}.`,
      }
      resolve(JSON.stringify(result, null, 2))
    })

    // Close stdin since upgrade-knausj doesn't need input for non-interactive mode
    child.stdin.end()
  })
}
