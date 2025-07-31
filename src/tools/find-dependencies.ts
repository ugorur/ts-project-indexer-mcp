import type { ProjectIndexer } from '#/core/indexer.js'

export interface FindDependenciesArgs {
  entityName: string
  direction?: 'incoming' | 'outgoing' | 'both'
  depth?: number
}

export async function findDependenciesTool(indexer: ProjectIndexer, args: FindDependenciesArgs) {
  const { entityName, direction = 'both', depth = 2 } = args

  if (!entityName) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'entityName parameter is required',
            message: 'Missing required parameter',
          }, null, 2),
        },
      ],
    }
  }

  const result = await indexer.findDependencies(entityName, direction, depth)

  const graphObj: Record<string, string[]> = {}
  for (const [key, value] of result.graph) {
    graphObj[key] = value
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          result: {
            entity: result.entity,
            incoming: result.incoming,
            outgoing: result.outgoing,
            graph: graphObj,
            summary: {
              incomingCount: result.incoming.length,
              outgoingCount: result.outgoing.length,
              totalNodes: result.graph.size,
            },
          },
          message: `Found ${result.incoming.length} incoming and ${result.outgoing.length} outgoing dependencies for "${entityName}"`,
        }, null, 2),
      },
    ],
  }
}
