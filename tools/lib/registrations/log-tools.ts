/**
 * Log tool registrations for Talon MCP Server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getLogsQuery, getLogsRegex, getRecentLogs } from '../get-logs'

export function registerLogTools(server: McpServer): void {
  server.tool(
    'talon_getRecentLogs',
    'Get the most recent Talon log entries',
    {
      lines: z.number().optional().describe('Number of log lines to return (default: 100)'),
    },
    async (params) => {
      const result = await getRecentLogs(params)
      return { content: [{ type: 'text', text: result }] }
    }
  )

  server.tool(
    'talon_getLogsRegex',
    'Filter Talon logs by regex pattern',
    {
      pattern: z.string().describe('Regex pattern to match log lines'),
      lines: z
        .number()
        .optional()
        .describe('Max number of matching lines to return (default: 100)'),
      flags: z.string().optional().describe('Regex flags (default: "i" for case-insensitive)'),
    },
    async (params) => {
      const result = await getLogsRegex(params)
      return { content: [{ type: 'text', text: result }] }
    }
  )

  server.tool(
    'talon_getLogsQuery',
    'Filter Talon logs by text search query',
    {
      query: z.string().describe('Text to search for in log lines'),
      lines: z
        .number()
        .optional()
        .describe('Max number of matching lines to return (default: 100)'),
      caseSensitive: z.boolean().optional().describe('Case-sensitive search (default: false)'),
    },
    async (params) => {
      const result = await getLogsQuery(params)
      return { content: [{ type: 'text', text: result }] }
    }
  )
}
