#!/usr/bin/env bun

/**
 * Talon MCP Server
 *
 * Model Context Protocol server for Talon accessibility framework.
 * Exposes tools for accessing logs, REPL, and system information.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { getTalonConfig } from './lib/config'
import { getLogsQuery, getLogsRegex, getRecentLogs } from './lib/get-logs'
import { getStatus } from './lib/get-status'
import { createKnowledge, getKnowledge, listKnowledge, searchKnowledge } from './lib/knowledge'
import { executeRepl } from './lib/repl'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

// Handle CLI flags
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Talon MCP Server v${packageJson.version}

Usage: talon-mcp [options]

Options:
  --help, -h      Show this help message
  --version, -v   Show version number

Description:
  MCP server for Talon accessibility framework.
  Exposes tools for accessing logs, REPL, and system information.

Tools:
  talon_getRecentLogs   Get recent Talon log entries
  talon_getLogsRegex    Filter logs by regex pattern
  talon_getLogsQuery    Filter logs by text search
  talon_getStatus       Check if Talon is running
  talon_repl            Execute Python code in Talon REPL
  talon_getConfig       Get Talon configuration paths
  talon_listKnowledge   List all knowledge documents
  talon_getKnowledge    Get a specific knowledge document
  talon_searchKnowledge Search knowledge documents
  talon_createKnowledge Create a new knowledge document
`)
  process.exit(0)
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(packageJson.version)
  process.exit(0)
}

// Create MCP server
const server = new McpServer({
  name: 'talon-mcp',
  version: packageJson.version,
})

// --- Log Tools ---

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
    lines: z.number().optional().describe('Max number of matching lines to return (default: 100)'),
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
    lines: z.number().optional().describe('Max number of matching lines to return (default: 100)'),
    caseSensitive: z.boolean().optional().describe('Case-sensitive search (default: false)'),
  },
  async (params) => {
    const result = await getLogsQuery(params)
    return { content: [{ type: 'text', text: result }] }
  }
)

// --- Status & Config Tools ---

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

// --- REPL Tool ---

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

// --- Knowledge Tools ---

server.tool('talon_listKnowledge', 'List all available Talon knowledge documents', {}, async () => {
  const result = listKnowledge()
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
})

server.tool(
  'talon_getKnowledge',
  'Get a specific Talon knowledge document by slug',
  {
    slug: z.string().describe('The slug/identifier of the knowledge document'),
  },
  async (params) => {
    const result = getKnowledge(params.slug)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'talon_searchKnowledge',
  'Search Talon knowledge documents by query',
  {
    query: z.string().describe('Search query to find in knowledge documents'),
  },
  async (params) => {
    const result = searchKnowledge(params.query)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'talon_createKnowledge',
  'Create a new Talon knowledge document',
  {
    slug: z
      .string()
      .describe('URL-friendly identifier for the document (e.g., "hot-reload-events")'),
    content: z.string().describe('Markdown content for the knowledge document'),
  },
  async (params) => {
    const result = createKnowledge(params.slug, params.content)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Failed to start Talon MCP server:', error)
  process.exit(1)
})
