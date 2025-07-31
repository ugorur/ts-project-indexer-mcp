import type { ProjectIndexer } from '#/core/indexer.js'

export class PathsResource {
  private indexer: ProjectIndexer

  constructor(indexer: ProjectIndexer) {
    this.indexer = indexer
  }

  async read() {
    const paths = this.indexer.getAllPaths()
    const stats = this.indexer.getProjectStats()

    const pathsByMethod = paths.reduce((acc, path) => {
      if (!acc[path.method]) acc[path.method] = []
      acc[path.method].push(path)
      return acc
    }, {} as Record<string, any[]>)

    return {
      contents: [
        {
          uri: 'project://paths',
          mimeType: 'application/json',
          text: JSON.stringify({
            summary: {
              totalPaths: paths.length,
              pathsByMethod: Object.fromEntries(
                Object.entries(pathsByMethod).map(([method, items]) => [method, items.length])
              ),
              lastIndexed: stats.lastIndexed,
            },
            pathsByMethod,
            allPaths: paths,
          }, null, 2),
        },
      ],
    }
  }
}
