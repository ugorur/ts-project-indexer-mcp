import chokidar from 'chokidar'
import type { ProjectIndexer } from '../core/indexer.js'

export class FileWatcher {
  private watcher?: chokidar.FSWatcher
  private indexer: ProjectIndexer
  private isWatching = false

  constructor(indexer: ProjectIndexer) {
    this.indexer = indexer
  }

  async start(projectPath: string): Promise<void> {
    if (this.isWatching) {
      await this.stop()
    }

    console.error(`👁️ Starting file watcher for: ${projectPath}`)

    this.watcher = chokidar.watch(projectPath, {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/.cache/**',
        '**/coverage/**',
        '**/*.log',
        '**/*.tmp',
        '**/*.temp',
      ],
      ignoreInitial: true,
      persistent: true,
      depth: 10,
    })

    this.watcher.on('add', this.handleFileAdd.bind(this))
    this.watcher.on('change', this.handleFileChange.bind(this))
    this.watcher.on('unlink', this.handleFileDelete.bind(this))
    this.watcher.on('addDir', this.handleDirectoryAdd.bind(this))
    this.watcher.on('unlinkDir', this.handleDirectoryDelete.bind(this))

    this.watcher.on('error', (error: Error) => {
      console.error('File watcher error:', error)
    })

    this.watcher.on('ready', () => {
      console.error('✅ File watcher ready')
      this.isWatching = true
    })
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      console.error('🛑 Stopping file watcher...')
      await this.watcher.close()
      this.watcher = undefined
      this.isWatching = false
    }
  }

  private async handleFileAdd(filePath: string): Promise<void> {
    console.error(`📄 File added: ${filePath}`)
    // Could trigger incremental indexing here
    this.scheduleReindex()
  }

  private async handleFileChange(filePath: string): Promise<void> {
    console.error(`📝 File changed: ${filePath}`)
    // Could trigger incremental indexing here
    this.scheduleReindex()
  }

  private async handleFileDelete(filePath: string): Promise<void> {
    console.error(`🗑️ File deleted: ${filePath}`)
    // Could remove from index here
    this.scheduleReindex()
  }

  private async handleDirectoryAdd(dirPath: string): Promise<void> {
    console.error(`📁 Directory added: ${dirPath}`)
    this.scheduleReindex()
  }

  private async handleDirectoryDelete(dirPath: string): Promise<void> {
    console.error(`📁 Directory deleted: ${dirPath}`)
    this.scheduleReindex()
  }

  private reindexTimeout?: NodeJS.Timeout

  private scheduleReindex(): void {
    // Debounce reindexing to avoid excessive updates
    if (this.reindexTimeout) {
      clearTimeout(this.reindexTimeout)
    }

    this.reindexTimeout = setTimeout(async () => {
      console.error('🔄 Triggering incremental reindex due to file changes...')
      // For now, just log. In a full implementation, we could trigger
      // selective reindexing of changed files only
    }, 2000) // Wait 2 seconds after last change
  }

  getStatus() {
    return {
      isWatching: this.isWatching,
      watchedPaths: this.watcher?.getWatched() || {},
    }
  }
}
