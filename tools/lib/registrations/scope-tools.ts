/**
 * Scope and status tool registrations for Talon MCP Server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getTalonConfig } from '../config'
import { evaluateScope } from '../evaluate-scope'
import { getScope, SCOPE_KEYS } from '../get-scope'
import { getStatus } from '../get-status'

export function registerScopeTools(server: McpServer): void {
  server.tool(
    'talon_getStatus',
    'Check if Talon is running and get status information',
    {},
    async () => {
      const result = await getStatus()
      return { content: [{ type: 'text', text: result }] }
    }
  )

  server.tool(
    'talon_getScope',
    'Get current Talon scope: mode (command/dictation), active app, window title, speech status, active tags, and active contexts. Use keys parameter to filter results.',
    {
      keys: z
        .array(z.enum(SCOPE_KEYS))
        .optional()
        .describe(
          `Filter to specific keys. Available: ${SCOPE_KEYS.join(', ')}. Empty or omitted returns all.`
        ),
    },
    async (params) => {
      const result = await getScope(params.keys)
      return { content: [{ type: 'text', text: result }] }
    }
  )

  server.tool(
    'talon_evaluateScope',
    'Evaluate Talon context conditions against current scope. Returns boolean result for each condition and final combined result.',
    {
      expression: z
        .string()
        .describe(
          'Context expression to evaluate. One condition per line. Supports: tag, mode, app, app.name, app.bundle, app.exe, title/win.title. Use "and"/"or" prefix for conjunctions, "not" for negation. Example: "tag: user.my_tag\\nand not mode: dictation"'
        ),
    },
    async (params) => {
      const result = await evaluateScope(params.expression)
      return { content: [{ type: 'text', text: result }] }
    }
  )

  server.tool(
    'talon_getConfig',
    'Get Talon configuration paths (home, logs, user scripts)',
    {},
    async () => {
      const config = getTalonConfig()
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, config }, null, 2),
          },
        ],
      }
    }
  )
}
