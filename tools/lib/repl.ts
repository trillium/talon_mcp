import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ReplResult } from './types'

export interface ReplParams {
  code: string
  timeout?: number
}

function getReplPath(): string {
  return process.env.TALON_REPL_PATH || join(homedir(), '.talon', '.venv', 'bin', 'repl')
}

export async function executeRepl(params: ReplParams): Promise<string> {
  const { code, timeout = 10000 } = params
  const replPath = getReplPath()

  return new Promise((resolve) => {
    const result: ReplResult = {
      success: false,
      output: '',
    }

    // Use bash to properly execute the REPL script with piped input
    const child = spawn('/bin/bash', ['-c', `echo ${JSON.stringify(code)} | "${replPath}"`], {
      timeout,
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (exitCode) => {
      // Remove the REPL header line if present
      const lines = stdout.split('\n')
      const outputLines = lines.filter((line) => !line.startsWith('Talon REPL |'))
      const cleanOutput = outputLines.join('\n').trim()

      if (exitCode === 0) {
        result.success = true
        result.output = cleanOutput
      } else {
        result.success = false
        result.output = cleanOutput
        result.error = stderr.trim() || `REPL exited with code ${exitCode}`
      }

      resolve(JSON.stringify(result))
    })

    child.on('error', (error) => {
      result.success = false
      result.error = `Failed to execute REPL: ${error.message}`
      resolve(JSON.stringify(result))
    })
  })
}
