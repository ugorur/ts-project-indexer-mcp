import type { ProjectIndexer } from '#/core/indexer.js'

export class MethodsResource {
  private indexer: ProjectIndexer

  constructor(indexer: ProjectIndexer) {
    this.indexer = indexer
  }

  async read() {
    const methods = this.indexer.getAllMethods()
    const stats = this.indexer.getProjectStats()

    const methodsByType = methods.reduce((acc, method) => {
      if (!acc[method.type]) acc[method.type] = []
      acc[method.type].push(method)
      return acc
    }, {} as Record<string, any[]>)

    return {
      contents: [
        {
          uri: 'project://methods',
          mimeType: 'application/json',
          text: JSON.stringify({
            summary: {
              totalMethods: methods.length,
              methodsByType: Object.fromEntries(
                Object.entries(methodsByType).map(([type, items]) => [type, items.length])
              ),
              lastIndexed: stats.lastIndexed,
            },
            methodsByType,
            allMethods: methods,
          }, null, 2),
        },
      ],
    }
  }

  async readRelationships() {
    const dependencies = this.indexer.getAllDependencies()
    const stats = this.indexer.getProjectStats()

    return {
      contents: [
        {
          uri: 'project://relationships',
          mimeType: 'application/json',
          text: JSON.stringify({
            summary: {
              totalDependencies: dependencies.length,
              lastIndexed: stats.lastIndexed,
            },
            dependencies,
          }, null, 2),
        },
      ],
    }
  }
}
