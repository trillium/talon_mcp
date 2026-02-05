import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

function getReplPath(): string {
  return process.env.TALON_REPL_PATH || join(homedir(), '.talon', '.venv', 'bin', 'repl')
}

// Fetch current scope data for evaluation
const SCOPE_SCRIPT = `import json;s=lambda o:list(o)if isinstance(o,set)else{k:s(v)for k,v in o.items()}if isinstance(o,dict)else o;print(json.dumps({"mode":s(scope.get("mode")),"app":s(scope.get("app")),"win":s(scope.get("win")),"tags":sorted([t for t in registry.tags])}))`

interface ParsedCondition {
  original: string
  conjunction: 'and' | 'or'
  negated: boolean
  type: string
  value: string
}

interface ConditionResult {
  expression: string
  conjunction: 'and' | 'or'
  negated: boolean
  match: boolean
  result: boolean // match XOR negated
}

export interface EvaluateScopeResult {
  success: boolean
  conditions?: ConditionResult[]
  final?: boolean
  error?: string
}

function parseExpression(expression: string): ParsedCondition[] {
  const lines = expression
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map((line, index) => {
    let conjunction: 'and' | 'or' = 'and'
    let remaining = line

    // Check for conjunction prefix
    if (remaining.toLowerCase().startsWith('and ')) {
      conjunction = 'and'
      remaining = remaining.slice(4).trim()
    } else if (remaining.toLowerCase().startsWith('or ')) {
      conjunction = 'or'
      remaining = remaining.slice(3).trim()
    } else if (index === 0) {
      // First line defaults to 'and' (starting point)
      conjunction = 'and'
    }

    // Check for negation
    let negated = false
    if (remaining.toLowerCase().startsWith('not ')) {
      negated = true
      remaining = remaining.slice(4).trim()
    }

    // Parse condition type and value
    const colonIndex = remaining.indexOf(':')
    if (colonIndex === -1) {
      throw new Error(`Invalid condition format (missing ':'): ${line}`)
    }

    const type = remaining.slice(0, colonIndex).trim().toLowerCase()
    const value = remaining.slice(colonIndex + 1).trim()

    return {
      original: line,
      conjunction,
      negated,
      type,
      value,
    }
  })
}

function evaluateCondition(
  condition: ParsedCondition,
  scopeData: {
    mode: string[]
    app: Record<string, unknown>
    win: Record<string, unknown>
    tags: string[]
  }
): boolean {
  const { type, value } = condition

  switch (type) {
    case 'tag': {
      return scopeData.tags.includes(value)
    }

    case 'mode': {
      const modes = scopeData.mode || []
      return modes.includes(value)
    }

    case 'app':
    case 'app.name': {
      const appName = (scopeData.app?.name as string) || ''
      return appName.toLowerCase().includes(value.toLowerCase())
    }

    case 'app.bundle': {
      const bundle = (scopeData.app?.bundle as string) || ''
      return bundle.toLowerCase() === value.toLowerCase()
    }

    case 'app.exe': {
      const exe = (scopeData.app?.exe as string) || ''
      return exe.toLowerCase().includes(value.toLowerCase())
    }

    case 'title':
    case 'win.title': {
      const title = (scopeData.win?.title as string) || ''
      // Support regex patterns with /pattern/
      if (value.startsWith('/') && value.endsWith('/')) {
        const pattern = value.slice(1, -1)
        try {
          const regex = new RegExp(pattern, 'i')
          return regex.test(title)
        } catch {
          return false
        }
      }
      return title.toLowerCase().includes(value.toLowerCase())
    }

    default:
      throw new Error(`Unknown condition type: ${type}`)
  }
}

function computeFinalResult(conditions: ConditionResult[]): boolean {
  if (conditions.length === 0) return true

  // Start with the first condition's result
  let result = conditions[0].result

  // Apply subsequent conditions with their conjunctions
  for (let i = 1; i < conditions.length; i++) {
    const cond = conditions[i]
    if (cond.conjunction === 'and') {
      result = result && cond.result
    } else {
      result = result || cond.result
    }
  }

  return result
}

export async function evaluateScope(expression: string): Promise<string> {
  const replPath = getReplPath()

  // Parse the expression first to catch syntax errors early
  let parsedConditions: ParsedCondition[]
  try {
    parsedConditions = parseExpression(expression)
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse expression',
    })
  }

  if (parsedConditions.length === 0) {
    return JSON.stringify({
      success: false,
      error: 'No conditions provided',
    })
  }

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
        const lines = stdout.split('\n')
        const jsonLine = lines.find((line) => line.startsWith('{'))

        if (jsonLine) {
          try {
            const scopeData = JSON.parse(jsonLine)

            // Evaluate each condition
            const conditionResults: ConditionResult[] = parsedConditions.map((cond) => {
              const match = evaluateCondition(cond, scopeData)
              return {
                expression: cond.original,
                conjunction: cond.conjunction,
                negated: cond.negated,
                match,
                result: cond.negated ? !match : match,
              }
            })

            const final = computeFinalResult(conditionResults)

            resolve(
              JSON.stringify(
                {
                  success: true,
                  conditions: conditionResults,
                  final,
                },
                null,
                2
              )
            )
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
      resolve(
        JSON.stringify({ success: false, error: `Failed to evaluate scope: ${error.message}` })
      )
    })
  })
}
