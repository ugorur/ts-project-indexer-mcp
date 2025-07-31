import type { ProjectIndexer } from '#/core/indexer.js'

export interface DebugDependenciesArgs {
  limit?: number
  filterBy?: string
}

export async function debugDependenciesTool(indexer: ProjectIndexer, args: DebugDependenciesArgs) {
  const { limit = 20, filterBy } = args

  const allDependencies = indexer.getAllDependencies()
  
  let filteredDeps = allDependencies
  if (filterBy) {
    filteredDeps = allDependencies.filter(dep => 
      dep.to.includes(filterBy) || 
      dep.from.includes(filterBy) ||
      (dep.resolvedTo && dep.resolvedTo.includes(filterBy))
    )
  }

  const limitedDeps = filteredDeps.slice(0, limit)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          result: {
            totalDependencies: allDependencies.length,
            filteredCount: filteredDeps.length,
            showing: limitedDeps.length,
            dependencies: limitedDeps.map(dep => ({
              from: dep.from,
              to: dep.to,
              resolvedTo: dep.resolvedTo,
              type: dep.type,
              line: dep.line,
              file: dep.file
            }))
          },
          message: `Showing ${limitedDeps.length} dependencies ${filterBy ? `filtered by "${filterBy}"` : ''}`
        }, null, 2),
      },
    ],
  }
}
