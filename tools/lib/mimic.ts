import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface MimicParams {
  phrase: string
  timeout?: number
}

export interface MimicResult {
  success: boolean
  phrase: string
  error?: string
}

function getReplPath(): string {
  return process.env.TALON_REPL_PATH || join(homedir(), '.talon', '.venv', 'bin', 'repl')
}

/**
 * Mimic a spoken phrase in Talon
 */
export async function mimicPhrase(params: MimicParams): Promise<string> {
  const { phrase, timeout = 10000 } = params
  const replPath = getReplPath()

  // Escape the phrase for Python string
  const escapedPhrase = phrase.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const code = `actions.mimic("${escapedPhrase}")`

  return new Promise((resolve) => {
    const result: MimicResult = {
      success: false,
      phrase,
    }

    const child = spawn('/bin/bash', ['-c', `echo ${JSON.stringify(code)} | "${replPath}"`], {
      timeout,
      env: { ...process.env },
    })

    let stderr = ''

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        result.success = true
      } else {
        result.success = false
        result.error = stderr.trim() || `Mimic failed with exit code ${exitCode}`
      }

      resolve(JSON.stringify(result))
    })

    child.on('error', (error) => {
      result.success = false
      result.error = `Failed to execute mimic: ${error.message}`
      resolve(JSON.stringify(result))
    })
  })
}
