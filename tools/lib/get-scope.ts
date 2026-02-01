import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

function getReplPath(): string {
  return process.env.TALON_REPL_PATH || join(homedir(), '.talon', '.venv', 'bin', 'repl')
}

// Compact single-line Python script for scope data
const SCOPE_SCRIPT = `import json;s=lambda o:list(o)if isinstance(o,set)else{k:s(v)for k,v in o.items()}if isinstance(o,dict)else o;st=speech_system.status();print(json.dumps({"mode":s(scope.get("mode")),"app":s(scope.get("app")),"win":s(scope.get("win")),"speech":{"ready":st.ready,"grammars":{n:{"enabled":g.enabled,"exclusive":g.exclusive,"priority":g.priority}for n,g in st.grammars.items()}},"active_contexts":[str(c)for c in registry.active_contexts()][:20],"active_contexts_count":len(list(registry.active_contexts()))}))`

export interface ScopeResult {
  success: boolean
  scope?: {
    mode: string[]
    app: {
      name: string
      bundle: string
      path: string
      exe: string
      app?: string[]
    }
    win: {
      title: string
      doc?: string
      filename?: string
      file_ext?: string
    }
    speech: {
      ready: boolean
      grammars: Record<string, { enabled: boolean; exclusive: boolean; priority: number }>
    }
    active_contexts: string[]
    active_contexts_count: number
  }
  error?: string
}

export async function getScope(): Promise<string> {
  const replPath = getReplPath()

  return new Promise((resolve) => {
    const child = spawn(
      '/bin/bash',
      ['-c', `echo ${JSON.stringify(SCOPE_SCRIPT)} | "${replPath}"`],
      {
        timeout: 10000,
        env: { ...process.env },
      }
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        // Extract JSON from output (skip REPL header)
        const lines = stdout.split('\n')
        const jsonLine = lines.find((line) => line.startsWith('{'))

        if (jsonLine) {
          try {
            const scope = JSON.parse(jsonLine)
            resolve(JSON.stringify({ success: true, scope }, null, 2))
          } catch {
            resolve(JSON.stringify({ success: false, error: 'Failed to parse scope data' }))
          }
        } else {
          resolve(JSON.stringify({ success: false, error: 'No scope data returned' }))
        }
      } else {
        resolve(
          JSON.stringify({
            success: false,
            error: stderr.trim() || `Failed with exit code ${exitCode}`,
          })
        )
      }
    })

    child.on('error', (error) => {
      resolve(JSON.stringify({ success: false, error: `Failed to get scope: ${error.message}` }))
    })
  })
}
