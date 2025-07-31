import type { ProjectIndexer } from '#/core/indexer.js'

export interface SearchMethodsArgs {
  query: string
  type?: 'method' | 'function' | 'class' | 'interface' | 'type' | 'all'
  includeUsages?: boolean
}

export async function searchMethodsTool(indexer: ProjectIndexer, args: SearchMethodsArgs) {
  const { query, type = 'all', includeUsages = false } = args

  if (!query) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Query parameter is required',
            message: 'Missing required parameter',
          }, null, 2),
        },
      ],
    }
  }

  const result = await indexer.searchMethods(query, type, includeUsages)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          result: {
            query: result.query,
            totalCount: result.totalCount,
            searchTime: result.searchTime,
            items: result.items.slice(0, 50),
          },
          message: `Found ${result.totalCount} matching items for query "${query}" in ${result.searchTime}ms`,
        }, null, 2),
      },
    ],
  }
}
