import type { ProjectIndexer } from '../core/indexer.js'

export class FilesResource {
  private indexer: ProjectIndexer

  constructor(indexer: ProjectIndexer) {
    this.indexer = indexer
  }

  async read() {
    const files = this.indexer.getAllFiles()
    const stats = this.indexer.getProjectStats()

    return {
      contents: [
        {
          uri: 'project://files',
          mimeType: 'application/json',
          text: JSON.stringify({
            summary: {
              totalFiles: files.length,
              lastIndexed: stats.lastIndexed,
            },
            files: files.map(file => ({
              path: file.path,
              relativePath: file.relativePath,
              name: file.name,
              extension: file.extension,
              size: file.size,
              lastModified: file.lastModified,
            })),
          }, null, 2),
        },
      ],
    }
  }
}
