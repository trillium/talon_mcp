/**
 * Knowledge tool registrations for Talon MCP Server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createKnowledge, getKnowledge, listKnowledge, searchKnowledge } from '../knowledge'

export function registerKnowledgeTools(server: McpServer): void {
  server.tool(
    'talon_listKnowledge',
    'List all available Talon knowledge documents',
    {},
    async () => {
      const result = listKnowledge()
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

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
}
