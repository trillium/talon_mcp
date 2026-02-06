import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { getTalonConfig } from './config'

interface CommandRecord {
  version: string
  action_type: string
  timestamp: string
  command: { trigger: string; rule: string; display: string }
  phrase: { words: string[]; text: string }
  context: {
    app: { name: string; bundle: string }
    window: { title: string; id: number }
    mode: string[]
    tags: string[]
  }
  metadata: { success: boolean }
}

export interface GetCommandHistoryParams {
  limit?: number
  query?: string
  since?: string
  verbose?: boolean
}

export async function getCommandHistory(params: GetCommandHistoryParams = {}): Promise<string> {
  const { limit = 20, query, since, verbose = false } = params
  const config = getTalonConfig()
  const commandsDir = join(config.talonHome, 'recordings', 'commands')

  let files: string[]
  try {
    files = await readdir(commandsDir)
  } catch {
    return JSON.stringify({
      success: false,
      error: `Commands directory not found at ${commandsDir}`,
    })
  }

  files = files.filter((f) => f.endsWith('.json'))
  files.sort((a, b) => b.localeCompare(a))

  const results: CommandRecord[] = []
  const sinceDate = since ? new Date(since) : null

  for (const file of files) {
    if (results.length >= limit) break

    try {
      const content = await Bun.file(join(commandsDir, file)).text()
      const record: CommandRecord = JSON.parse(content)

      if (sinceDate && new Date(record.timestamp) < sinceDate) break

      if (query) {
        const q = query.toLowerCase()
        const matchesPhrase = record.phrase.text.toLowerCase().includes(q)
        const matchesTrigger = record.command.trigger.toLowerCase().includes(q)
        const matchesApp = record.context.app.name.toLowerCase().includes(q)
        if (!matchesPhrase && !matchesTrigger && !matchesApp) continue
      }

      results.push(record)
    } catch {
      // Skip malformed files
    }
  }

  if (verbose) {
    return JSON.stringify({
      success: true,
      count: results.length,
      commands: results.map((r) => ({
        timestamp: r.timestamp,
        trigger: r.command.trigger,
        phrase: r.phrase.text,
        app: r.context.app.name,
        window: r.context.window.title,
        tags: r.context.tags,
        success: r.metadata.success,
      })),
    })
  }

  // Compact: one line per command, minimal tokens
  const time = (ts: string) => ts.slice(11, 19)
  const lines = results.map((r) => {
    const t = time(r.timestamp)
    const fail = r.metadata.success ? '' : ' FAIL'
    return `${t} [${r.context.app.name}] ${r.phrase.text}${fail}`
  })

  return JSON.stringify({
    success: true,
    count: results.length,
    commands: lines.join('\n'),
  })
}
