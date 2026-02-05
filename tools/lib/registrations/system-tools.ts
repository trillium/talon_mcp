/**
 * System tool registrations for Talon MCP Server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { mimicPhrase } from '../mimic'
import { executeRepl } from '../repl'
import { restartTalon } from '../restart'
import { getStartupHistory, getStartupStatus } from '../startup-status'
import { runUpgradeKnausj } from '../upgrade-knausj'

export function registerSystemTools(server: McpServer): void {
  server.tool(
    'talon_repl',
    'Execute Python code in Talon REPL. Has access to all Talon modules (talon, talon.app, etc.)',
    {
      code: z.string().describe('Python code to execute'),
      timeout: z.number().optional().describe('Timeout in milliseconds (default: 10000)'),
    },
    async (params) => {
      const result = await executeRepl(params)
      return { content: [{ type: 'text', text: result }] }
    }
  )

  server.tool(
    'talon_restart',
    'Quit and relaunch Talon. Use this to apply configuration changes or recover from issues.',
    {},
    async () => {
      const result = await restartTalon()
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'talon_getStartupStatus',
    'Get the startup status from the most recent Talon launch. Shows errors and warnings that occurred during startup.',
    {},
    async () => {
      const status = getStartupStatus()
      if (!status) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'No startup status file found' }, null, 2),
            },
          ],
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
    }
  )

  server.tool(
    'talon_getStartupHistory',
    'Get startup status history from recent Talon launches. Useful for tracking recurring issues.',
    {
      limit: z
        .number()
        .optional()
        .describe('Number of history entries to return (default: 10, max: 20)'),
    },
    async (params) => {
      const limit = Math.min(params.limit ?? 10, 20)
      const history = getStartupHistory(limit)
      return { content: [{ type: 'text', text: JSON.stringify(history, null, 2) }] }
    }
  )

  server.tool(
    'talon_mimic',
    'Simulate speaking a phrase to Talon. Executes the phrase as if it were spoken by the user.',
    {
      phrase: z
        .string()
        .describe('The phrase to simulate speaking (e.g., "go to sleep", "help alphabet")'),
    },
    async (params) => {
      const result = await mimicPhrase(params)
      return { content: [{ type: 'text', text: result }] }
    }
  )

  server.tool(
    'talon_upgradeKnausj',
    'Run upgrade-knausj to upgrade your Talon community scripts fork (talonhub/community, formerly knausj_talon/knausj). Clones your repo, merges with latest upstream community, handles autoformatting. If conflicts occur, resolve them and re-run.',
    {},
    async () => {
      const result = await runUpgradeKnausj()
      return { content: [{ type: 'text', text: result }] }
    }
  )
}
