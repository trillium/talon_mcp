import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_DIR = join(__dirname, '..', '..', 'knowledge')

export interface KnowledgeDoc {
  slug: string
  title: string
  content: string
}

export interface ListKnowledgeResult {
  success: boolean
  docs: { slug: string; title: string }[]
  error?: string
}

export interface GetKnowledgeResult {
  success: boolean
  doc?: KnowledgeDoc
  error?: string
}

export interface CreateKnowledgeResult {
  success: boolean
  slug?: string
  path?: string
  error?: string
}

/**
 * Extract title from markdown content (first # heading)
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
}

/**
 * List all knowledge documents
 */
export function listKnowledge(): ListKnowledgeResult {
  try {
    if (!existsSync(KNOWLEDGE_DIR)) {
      return { success: true, docs: [] }
    }

    const files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith('.md'))
    const docs = files.map((file) => {
      const content = readFileSync(join(KNOWLEDGE_DIR, file), 'utf-8')
      return {
        slug: basename(file, '.md'),
        title: extractTitle(content),
      }
    })

    return { success: true, docs }
  } catch (error) {
    return {
      success: false,
      docs: [],
      error: `Failed to list knowledge: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Get a specific knowledge document by slug
 */
export function getKnowledge(slug: string): GetKnowledgeResult {
  try {
    const filePath = join(KNOWLEDGE_DIR, `${slug}.md`)

    if (!existsSync(filePath)) {
      return { success: false, error: `Knowledge doc not found: ${slug}` }
    }

    const content = readFileSync(filePath, 'utf-8')
    return {
      success: true,
      doc: {
        slug,
        title: extractTitle(content),
        content,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to get knowledge: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Search knowledge documents by query
 */
export function searchKnowledge(query: string): ListKnowledgeResult {
  try {
    const allDocs = listKnowledge()
    if (!allDocs.success) return allDocs

    const queryLower = query.toLowerCase()
    const matchingDocs = allDocs.docs.filter((doc) => {
      const content = readFileSync(join(KNOWLEDGE_DIR, `${doc.slug}.md`), 'utf-8').toLowerCase()
      return content.includes(queryLower) || doc.title.toLowerCase().includes(queryLower)
    })

    return { success: true, docs: matchingDocs }
  } catch (error) {
    return {
      success: false,
      docs: [],
      error: `Failed to search knowledge: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Create a new knowledge document
 */
export function createKnowledge(slug: string, content: string): CreateKnowledgeResult {
  try {
    // Sanitize slug
    const safeSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!safeSlug) {
      return { success: false, error: 'Invalid slug' }
    }

    const filePath = join(KNOWLEDGE_DIR, `${safeSlug}.md`)

    if (existsSync(filePath)) {
      return { success: false, error: `Knowledge doc already exists: ${safeSlug}` }
    }

    writeFileSync(filePath, content, 'utf-8')

    return { success: true, slug: safeSlug, path: filePath }
  } catch (error) {
    return {
      success: false,
      error: `Failed to create knowledge: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
