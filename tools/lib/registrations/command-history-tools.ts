/**
 * Command history tool registrations for Talon MCP Server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getCommandHistory } from '../command-history'

export function registerCommandHistoryTools(server: McpServer): void {
  server.tool(
    'talon_getCommandHistory',
    'Get recent Talon voice command history. Compact by default (one line per command). Use verbose=true for structured data with window titles and tags.',
    {
      limit: z.number().optional().describe('Max commands to return (default: 20)'),
      query: z.string().optional().describe('Filter by text match on phrase, trigger, or app name'),
      since: z
        .string()
        .optional()
        .describe('Only return commands after this ISO timestamp (e.g. "2026-02-05T10:00:00")'),
      verbose: z
        .boolean()
        .optional()
        .describe('Return structured JSON per command instead of compact text (default: false)'),
    },
    async (params) => {
      const result = await getCommandHistory(params)
      return { content: [{ type: 'text', text: result }] }
    }
  )
}
