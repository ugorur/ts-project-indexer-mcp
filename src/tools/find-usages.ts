import type { ProjectIndexer } from '#/core/indexer.js'

export interface FindUsagesArgs {
  filePath?: string
  methodName?: string
  className?: string
  searchType: 'imports' | 'usages' | 'both'
  includeDetails?: boolean
}

export async function findUsagesTool(indexer: ProjectIndexer, args: FindUsagesArgs) {
  const { filePath, methodName, className, searchType, includeDetails = true } = args

  if (!filePath && !methodName && !className) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Either filePath, methodName, or className is required',
            message: 'Missing required parameter',
          }, null, 2),
        },
      ],
    }
  }

  const startTime = Date.now()
  const result = await indexer.findUsages({
    filePath,
    methodName,
    className,
    searchType,
    includeDetails,
  })
  const searchTime = Date.now() - startTime

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          result: {
            searchType,
            query: filePath || methodName || className,
            totalCount: result.length,
            searchTime,
            usages: result.slice(0, 100), // Limit to 100 results
          },
          message: `Found ${result.length} usages for "${filePath || methodName || className}" in ${searchTime}ms`,
        }, null, 2),
      },
    ],
  }
}
