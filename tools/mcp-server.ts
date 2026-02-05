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
import {
  registerKnowledgeTools,
  registerLogTools,
  registerScopeTools,
  registerSystemTools,
} from './lib/registrations'

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
  talon_getRecentLogs     Get recent Talon log entries
  talon_getLogsRegex      Filter logs by regex pattern
  talon_getLogsQuery      Filter logs by text search
  talon_getStatus         Check if Talon is running
  talon_getScope          Get current mode, app, window, tags, and active contexts
  talon_evaluateScope     Evaluate context conditions against current scope
  talon_repl              Execute Python code in Talon REPL
  talon_getConfig         Get Talon configuration paths
  talon_listKnowledge     List all knowledge documents
  talon_getKnowledge      Get a specific knowledge document
  talon_searchKnowledge   Search knowledge documents
  talon_createKnowledge   Create a new knowledge document
  talon_restart           Quit and relaunch Talon
  talon_getStartupStatus  Get errors/warnings from last startup
  talon_getStartupHistory Get startup status history
  talon_mimic             Simulate speaking a phrase
  talon_upgradeKnausj     Upgrade community/knausj fork to latest
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

// Register all tools
registerLogTools(server)
registerScopeTools(server)
registerKnowledgeTools(server)
registerSystemTools(server)

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Failed to start Talon MCP server:', error)
  process.exit(1)
})
