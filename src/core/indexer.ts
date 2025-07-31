import { promises as fs } from 'node:fs'
import { join, relative, resolve, basename, extname } from 'node:path'
import type { CacheManager } from '../cache/cache-manager.js'
import { CodeParser } from './parser.js'
import { PathResolver } from './path-resolver.js'
import { logger } from '../mcp-server.js'
import type {
  FileInfo,
  MethodInfo,
  PathInfo,
  Dependency,
  IndexData,
  AnalysisOptions,
  SearchResult,
} from './types.js'

export class ProjectIndexer {
  private cache: CacheManager
  private parser: CodeParser
  private pathResolver: PathResolver | null = null
  private indexData: IndexData

  constructor(cache: CacheManager) {
    this.cache = cache
    this.parser = new CodeParser()
    this.indexData = {
      files: new Map(),
      methods: new Map(),
      paths: new Map(),
      dependencies: new Map(),
      lastIndexed: new Date(0),
    }
    logger.operation('ProjectIndexer initialized', `Current working directory: ${process.cwd()}`)
  }

  async initialize(): Promise<void> {
    await this.cache.init()
  }

  async analyzeProject(options: AnalysisOptions): Promise<{
    totalFiles: number
    totalMethods: number
    totalPaths: number
    totalDependencies: number
    duration: number
  }> {
    const startTime = Date.now()
    const projectPath = resolve(options.projectPath)

    logger.operation('analyzeProject started', `Project path: ${projectPath}`)
    logger.debug(`Analiz seçenekleri: ${JSON.stringify(options, null, 2)}`)
    logger.debug(`Force reindex: ${options.forceReindex}`)
    logger.debug(`Include patterns: ${options.includePatterns.join(', ')}`)
    logger.debug(`Exclude patterns: ${options.excludePatterns.join(', ')}`)

    // Initialize PathResolver for proper import resolution (always needed)
    logger.operation('PathResolver initialization', `Initializing for project: ${projectPath}`)
    this.pathResolver = new PathResolver(projectPath)
    await this.pathResolver.initialize()
    this.parser.setPathResolver(this.pathResolver)
    logger.debug('PathResolver başarıyla başlatıldı ve parser\'a atandı')

    // Check if we can use cached data
    const cacheKey = `project-${projectPath}-${JSON.stringify(options)}`
    logger.debug(`Cache anahtarı oluşturuldu: ${cacheKey}`)
    const cachedData = await this.cache.get<IndexData>(cacheKey)

    if (cachedData && !options.forceReindex) {
      logger.info('Cache\'den veri kullanılıyor - reindex atlanıyor')
      this.indexData = this.deserializeIndexData(cachedData)
      const stats = this.getStats(Date.now() - startTime)
      logger.operation('analyzeProject completed (cached)', `Duration: ${stats.duration}ms, Files: ${stats.totalFiles}, Methods: ${stats.totalMethods}`)
      return stats
    }

    logger.operation('File discovery started', `Searching in: ${projectPath}`)
    // Find all files to analyze
    const files = await this.findFiles(projectPath, options)
    logger.info(`${files.length} dosya bulundu analiz için`)
    logger.debug(`Bulunan dosyalar: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`)

    // Clear existing data
    logger.debug('Mevcut index verisi temizleniyor')
    this.clearIndexData()

    // Process files in batches for better performance
    const batchSize = 50
    logger.operation('File processing started', `Processing ${files.length} files in batches of ${batchSize}`)
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(files.length / batchSize)
      
      logger.debug(`Batch ${batchNumber}/${totalBatches} işleniyor (${batch.length} dosya)`)
      await Promise.all(batch.map((file: string) => this.processFile(file, projectPath)))
      
      // Progress logging every 5 batches
      if (batchNumber % 5 === 0 || batchNumber === totalBatches) {
        const processedFiles = Math.min(i + batchSize, files.length)
        logger.info(`İlerleme: ${processedFiles}/${files.length} dosya işlendi (${Math.round(processedFiles / files.length * 100)}%)`)
      }
    }

    this.indexData.lastIndexed = new Date()

    // Cache the results
    logger.operation('Caching results', `Saving to cache with key: ${cacheKey}`)
    await this.cache.set(cacheKey, this.serializeIndexData(), 1000 * 60 * 60 * 24) // 24 hours
    logger.debug('Sonuçlar cache\'e başarıyla kaydedildi')

    const duration = Date.now() - startTime
    const stats = this.getStats(duration)
    logger.operation('analyzeProject completed', 
      `Duration: ${stats.duration}ms, Files: ${stats.totalFiles}, Methods: ${stats.totalMethods}, Paths: ${stats.totalPaths}, Dependencies: ${stats.totalDependencies}`)
    
    return stats
  }

  async searchMethods(
    query: string,
    type: 'method' | 'function' | 'class' | 'interface' | 'type' | 'all' = 'all',
    includeUsages = false
  ): Promise<SearchResult<MethodInfo & { usages?: string[] }>> {
    const startTime = Date.now()
    const results: (MethodInfo & { usages?: string[] })[] = []

    const queryLower = query.toLowerCase()
    const queryRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    for (const [filePath, methods] of this.indexData.methods) {
      for (const method of methods) {
        // Type filter
        if (type !== 'all' && method.type !== type) continue

        // Name matching
        const nameMatch = method.name.toLowerCase().includes(queryLower) || 
                         queryRegex.test(method.name)

        if (nameMatch) {
          const result: MethodInfo & { usages?: string[] } = { ...method }
          
          if (includeUsages) {
            result.usages = this.findMethodUsages(method.name)
          }
          
          results.push(result)
        }
      }
    }

    return {
      items: results,
      totalCount: results.length,
      query,
      searchTime: Date.now() - startTime,
    }
  }

  async findDependencies(
    entityName: string,
    direction: 'incoming' | 'outgoing' | 'both' = 'both',
    depth = 2
  ): Promise<{
    entity: string
    incoming: Dependency[]
    outgoing: Dependency[]
    graph: Map<string, string[]>
  }> {
    const incoming: Dependency[] = []
    const outgoing: Dependency[] = []
    const visited = new Set<string>()
    const graph = new Map<string, string[]>()

    this.findDependenciesRecursive(entityName, direction, depth, incoming, outgoing, visited, graph)

    return {
      entity: entityName,
      incoming,
      outgoing,
      graph,
    }
  }

  getFileInfo(filePath: string): FileInfo | null {
    return this.indexData.files.get(filePath) || null
  }

  getMethodsInFile(filePath: string): MethodInfo[] {
    return this.indexData.methods.get(filePath) || []
  }

  getPathsInFile(filePath: string): PathInfo[] {
    return this.indexData.paths.get(filePath) || []
  }

  getAllFiles(): FileInfo[] {
    return Array.from(this.indexData.files.values())
  }

  getAllMethods(): MethodInfo[] {
    const methods: MethodInfo[] = []
    for (const fileMethods of this.indexData.methods.values()) {
      methods.push(...fileMethods)
    }
    return methods
  }

  getAllPaths(): PathInfo[] {
    const paths: PathInfo[] = []
    for (const filePaths of this.indexData.paths.values()) {
      paths.push(...filePaths)
    }
    return paths
  }

  getAllDependencies(): Dependency[] {
    const dependencies: Dependency[] = []
    for (const fileDeps of this.indexData.dependencies.values()) {
      dependencies.push(...fileDeps)
    }
    return dependencies
  }

  async findUsages(options: {
    filePath?: string
    methodName?: string
    className?: string
    searchType: 'imports' | 'usages' | 'both'
    includeDetails?: boolean
  }): Promise<Array<{
    file: string
    line: number
    type: 'import' | 'usage'
    context: string
    from?: string
    to?: string
    resolvedTo?: string
  }>> {
    const results: Array<{
      file: string
      line: number
      type: 'import' | 'usage'
      context: string
      from?: string
      to?: string
      resolvedTo?: string
    }> = []

    const { filePath, methodName, className, searchType } = options

    for (const [file, dependencies] of this.indexData.dependencies) {
      for (const dep of dependencies) {
        let isMatch = false
        let matchType: 'import' | 'usage' = 'usage'

        // Check for file path imports using full path matching
        if (filePath && searchType !== 'usages') {
          // Convert search path to absolute path for exact matching
          const searchAbsolutePath = resolve(filePath)
          
          // Primary match: exact absolute path comparison
          if (dep.resolvedTo && resolve(dep.resolvedTo) === searchAbsolutePath) {
            isMatch = true
            matchType = 'import'
          }
          
          // Secondary match: try to resolve the import on-the-fly
          if (!isMatch && this.pathResolver) {
            const resolvedDepPath = this.pathResolver.resolveImportPath(dep.to, dep.from)
            if (resolvedDepPath && resolve(resolvedDepPath) === searchAbsolutePath) {
              isMatch = true
              matchType = 'import'
            }
          }
          
          // Fallback: filename and path suffix matching for backwards compatibility
          if (!isMatch) {
            const searchPath = filePath.replace(/\\/g, '/').replace(/\.(ts|js)$/, '')
            const searchFilename = searchPath.split('/').pop() || ''
            const depToPath = dep.to.replace(/\\/g, '/').replace(/\.(ts|js)$/, '')
            const depToFilename = depToPath.split('/').pop() || ''
            
            if (
              // Filename match
              (searchFilename && depToFilename === searchFilename) ||
              // Path suffix match
              depToPath.endsWith(searchPath) ||
              searchPath.endsWith(depToPath) ||
              // Direct inclusion check
              dep.to.includes(filePath) ||
              dep.to.includes(searchPath)
            ) {
              isMatch = true
              matchType = 'import'
            }
          }
        }

        // Check for method/class usages
        if ((methodName || className) && searchType !== 'imports') {
          const searchTerm = methodName || className
          if (dep.to.includes(searchTerm!) || dep.from.includes(searchTerm!)) {
            isMatch = true
            matchType = 'usage'
          }
        }

        if (isMatch) {
          results.push({
            file,
            line: dep.line || 0,
            type: matchType,
            context: dep.type || 'unknown',
            from: dep.from,
            to: dep.to,
            resolvedTo: dep.resolvedTo,
          })
        }
      }
    }

    return results
  }

  getProjectStats() {
    return {
      totalFiles: this.indexData.files.size,
      totalMethods: this.getAllMethods().length,
      totalPaths: this.getAllPaths().length,
      totalDependencies: this.getAllDependencies().length,
      lastIndexed: this.indexData.lastIndexed,
    }
  }

  private async findFiles(projectPath: string, options: AnalysisOptions): Promise<string[]> {
    const allFiles: string[] = []
    
    const shouldInclude = (filePath: string): boolean => {
      const relativePath = relative(projectPath, filePath)
      
      // Check exclude patterns
      for (const excludePattern of options.excludePatterns) {
        if (this.matchesPattern(relativePath, excludePattern)) {
          return false
        }
      }
      
      // Check include patterns
      if (options.includePatterns.length === 0) return true
      
      for (const includePattern of options.includePatterns) {
        if (this.matchesPattern(relativePath, includePattern)) {
          return true
        }
      }
      
      return false
    }

    const walkDirectory = async (dirPath: string): Promise<void> => {
      try {
        // Ensure we don't go outside the project root
        const resolvedDirPath = resolve(dirPath)
        const resolvedProjectPath = resolve(projectPath)
        
        if (!resolvedDirPath.startsWith(resolvedProjectPath)) {
          console.error(`🚫 Skipping directory outside project root: ${resolvedDirPath}`)
          return
        }
        
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name)
          const resolvedFullPath = resolve(fullPath)
          
          // Double-check each entry doesn't escape project root
          if (!resolvedFullPath.startsWith(resolvedProjectPath)) {
            console.error(`🚫 Skipping path outside project root: ${resolvedFullPath}`)
            continue
          }
          
          if (entry.isDirectory()) {
            await walkDirectory(fullPath)
          } else if (entry.isFile() && shouldInclude(fullPath) && this.parser.shouldParseFile(fullPath)) {
            allFiles.push(fullPath)
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await walkDirectory(projectPath)
    return allFiles
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple pattern matching - convert glob-like patterns to regex
    const normalizedPath = filePath.replace(/\\/g, '/')
    const normalizedPattern = pattern.replace(/\\/g, '/')
    
    // Escape special regex characters first, except our glob characters
    let regexPattern = normalizedPattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars except * and ?
    
    // Now handle glob patterns
    regexPattern = regexPattern
      .replace(/\*\*/g, '___DOUBLESTAR___')  // Temporary placeholder
      .replace(/\*/g, '[^/]*')               // * matches any characters except /
      .replace(/___DOUBLESTAR___/g, '.*')    // ** matches any characters including /
      .replace(/\?/g, '.')                   // ? matches any single character
    
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(normalizedPath)
  }

  private async processFile(filePath: string, projectRoot: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      const relativePath = relative(projectRoot, filePath)

      logger.debug(`Dosya işleniyor: ${relativePath} (${stats.size} bytes)`)

      // Store file info
      const fileInfo: FileInfo = {
        path: filePath,
        name: basename(filePath),
        extension: extname(filePath),
        size: stats.size,
        lastModified: stats.mtime,
        isDirectory: stats.isDirectory(),
        relativePath,
      }
      this.indexData.files.set(filePath, fileInfo)

      // Parse code content
      if (this.parser.shouldParseFile(filePath)) {
        logger.debug(`Code parsing başlıyor: ${relativePath}`)
        const parseStartTime = Date.now()
        const { methods, paths, dependencies } = await this.parser.parseFile(filePath)
        const parseTime = Date.now() - parseStartTime
        
        logger.debug(`Parse tamamlandı: ${relativePath} (${parseTime}ms) - Methods: ${methods.length}, Paths: ${paths.length}, Dependencies: ${dependencies.length}`)
        
        if (methods.length > 0) {
          this.indexData.methods.set(filePath, methods)
          logger.debug(`${methods.length} method index'e eklendi: ${relativePath}`)
        }
        
        if (paths.length > 0) {
          this.indexData.paths.set(filePath, paths)
          logger.debug(`${paths.length} path index'e eklendi: ${relativePath}`)
        }
        
        if (dependencies.length > 0) {
          this.indexData.dependencies.set(filePath, dependencies)
          logger.debug(`${dependencies.length} dependency index'e eklendi: ${relativePath}`)
        }
      } else {
        logger.debug(`Dosya parse edilmiyor (desteklenmeyen format): ${relativePath}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Dosya işleme hatası ${filePath}: ${errorMessage}`)
      console.error(`Error processing file ${filePath}:`, error)
    }
  }

  private findMethodUsages(methodName: string): string[] {
    const usages: string[] = []
    
    for (const [filePath, dependencies] of this.indexData.dependencies) {
      for (const dep of dependencies) {
        if (dep.to.includes(methodName) || dep.from.includes(methodName)) {
          usages.push(`${filePath}:${dep.line}`)
        }
      }
    }
    
    return usages
  }

  private findDependenciesRecursive(
    entityName: string,
    direction: 'incoming' | 'outgoing' | 'both',
    depth: number,
    incoming: Dependency[],
    outgoing: Dependency[],
    visited: Set<string>,
    graph: Map<string, string[]>,
    currentDepth = 0
  ): void {
    if (currentDepth >= depth || visited.has(entityName)) return
    
    visited.add(entityName)

    for (const [filePath, dependencies] of this.indexData.dependencies) {
      for (const dep of dependencies) {
        if (direction === 'outgoing' || direction === 'both') {
          if (dep.from.includes(entityName)) {
            outgoing.push(dep)
            if (!graph.has(dep.from)) graph.set(dep.from, [])
            graph.get(dep.from)!.push(dep.to)
            
            this.findDependenciesRecursive(
              dep.to, direction, depth, incoming, outgoing, visited, graph, currentDepth + 1
            )
          }
        }

        if (direction === 'incoming' || direction === 'both') {
          if (dep.to.includes(entityName)) {
            incoming.push(dep)
            if (!graph.has(dep.to)) graph.set(dep.to, [])
            graph.get(dep.to)!.push(dep.from)
            
            this.findDependenciesRecursive(
              dep.from, direction, depth, incoming, outgoing, visited, graph, currentDepth + 1
            )
          }
        }
      }
    }
  }

  private clearIndexData(): void {
    this.indexData.files.clear()
    this.indexData.methods.clear()
    this.indexData.paths.clear()
    this.indexData.dependencies.clear()
  }

  private getStats(duration: number) {
    return {
      totalFiles: this.indexData.files.size,
      totalMethods: this.getAllMethods().length,
      totalPaths: this.getAllPaths().length,
      totalDependencies: this.getAllDependencies().length,
      duration,
    }
  }

  private serializeIndexData(): any {
    return {
      files: Array.from(this.indexData.files.entries()),
      methods: Array.from(this.indexData.methods.entries()),
      paths: Array.from(this.indexData.paths.entries()),
      dependencies: Array.from(this.indexData.dependencies.entries()),
      lastIndexed: this.indexData.lastIndexed,
    }
  }

  private deserializeIndexData(data: any): IndexData {
    return {
      files: new Map(data.files),
      methods: new Map(data.methods),
      paths: new Map(data.paths),
      dependencies: new Map(data.dependencies),
      lastIndexed: new Date(data.lastIndexed),
    }
  }
}
