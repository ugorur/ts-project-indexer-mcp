#!/usr/bin/env node

import { ProjectIndexer } from './core/indexer.js'
import { CacheManager } from './cache/cache-manager.js'
import { SimpleFileWatcher } from './watchers/simple-file-watcher.js'
import { logger } from './mcp-server.js'

interface ToolRequest {
  tool: string
  args: any
}

interface ToolResponse {
  success: boolean
  result?: any
  error?: string
  message: string
}

class SimpleProjectIndexer {
  private indexer: ProjectIndexer
  private cache: CacheManager

  constructor() {
    this.cache = new CacheManager()
    this.indexer = new ProjectIndexer(this.cache)
  }

  async initialize(): Promise<void> {
    await this.indexer.initialize()
  }

  async handleRequest(request: ToolRequest): Promise<ToolResponse> {
    try {
      switch (request.tool) {
        case 'analyze_project':
          return await this.analyzeProject(request.args)
        case 'search_methods':
          return await this.searchMethods(request.args)
        case 'find_dependencies':
          return await this.findDependencies(request.args)
        case 'generate_graph':
          return await this.generateGraph(request.args)
        case 'get_files':
          return await this.getFiles()
        case 'get_methods':
          return await this.getMethods()
        case 'get_paths':
          return await this.getPaths()
        case 'get_stats':
          return await this.getStats()
        default:
          return {
            success: false,
            error: `Unknown tool: ${request.tool}`,
            message: 'Tool not found',
          }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: errorMessage,
        message: 'Tool execution failed',
      }
    }
  }

  private async analyzeProject(args: any): Promise<ToolResponse> {
    const {
      projectPath = '../',
      includePatterns = ['**/*.ts', '**/*.js', '**/*.json'],
      excludePatterns = ['node_modules/**', 'dist/**', '**/*.d.ts'],
      forceReindex = false,
    } = args

    const result = await this.indexer.analyzeProject({
      projectPath,
      includePatterns,
      excludePatterns,
      forceReindex,
    })

    return {
      success: true,
      result,
      message: `Project analysis complete! Found ${result.totalFiles} files, ${result.totalMethods} methods, ${result.totalPaths} paths, and ${result.totalDependencies} dependencies in ${result.duration}ms.`,
    }
  }

  private async searchMethods(args: any): Promise<ToolResponse> {
    const { query, type = 'all', includeUsages = false } = args

    if (!query) {
      return {
        success: false,
        error: 'Query parameter is required',
        message: 'Missing required parameter',
      }
    }

    const result = await this.indexer.searchMethods(query, type, includeUsages)

    return {
      success: true,
      result: {
        query: result.query,
        totalCount: result.totalCount,
        searchTime: result.searchTime,
        items: result.items.slice(0, 50),
      },
      message: `Found ${result.totalCount} matching items for query "${query}" in ${result.searchTime}ms`,
    }
  }

  private async findDependencies(args: any): Promise<ToolResponse> {
    const { entityName, direction = 'both', depth = 2 } = args

    if (!entityName) {
      return {
        success: false,
        error: 'entityName parameter is required',
        message: 'Missing required parameter',
      }
    }

    const result = await this.indexer.findDependencies(entityName, direction, depth)

    const graphObj: Record<string, string[]> = {}
    for (const [key, value] of result.graph) {
      graphObj[key] = value
    }

    return {
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
    }
  }

  private async generateGraph(args: any): Promise<ToolResponse> {
    const { format = 'json', scope = 'services', maxNodes = 50 } = args

    const allMethods = this.indexer.getAllMethods()
    const allDependencies = this.indexer.getAllDependencies()

    const filteredMethods = allMethods.filter(method => {
      switch (scope) {
        case 'services':
          return method.file.includes('/services/') || method.file.includes('\\services\\')
        case 'controllers':
          return method.file.includes('/controllers/') || method.file.includes('\\controllers\\') || 
                 method.file.includes('/routes/') || method.file.includes('\\routes\\')
        case 'types':
          return method.type === 'interface' || method.type === 'type' || method.type === 'enum'
        case 'full':
        default:
          return true
      }
    }).slice(0, maxNodes)

    let graphContent = JSON.stringify({
      nodes: filteredMethods.map(m => ({ id: m.name, type: m.type, file: m.file })),
      edges: allDependencies.map(d => ({ from: d.from, to: d.to, type: d.type })),
    }, null, 2)

    if (format === 'mermaid') {
      const lines = ['graph TD']
      for (const method of filteredMethods) {
        const nodeId = method.name.replace(/[^a-zA-Z0-9_]/g, '_')
        lines.push(`    ${nodeId}["${method.name}[${method.type}]"]`)
      }
      graphContent = lines.join('\n')
    }

    return {
      success: true,
      result: {
        format,
        scope,
        nodeCount: filteredMethods.length,
        edgeCount: allDependencies.length,
        graph: graphContent,
      },
      message: `Generated ${format} graph with ${filteredMethods.length} nodes and ${allDependencies.length} edges`,
    }
  }

  private async getFiles(): Promise<ToolResponse> {
    const files = this.indexer.getAllFiles()
    const stats = this.indexer.getProjectStats()

    return {
      success: true,
      result: {
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
      },
      message: `Retrieved ${files.length} files`,
    }
  }

  private async getMethods(): Promise<ToolResponse> {
    const methods = this.indexer.getAllMethods()
    const stats = this.indexer.getProjectStats()

    const methodsByType = methods.reduce((acc, method) => {
      if (!acc[method.type]) acc[method.type] = []
      acc[method.type].push(method)
      return acc
    }, {} as Record<string, any[]>)

    return {
      success: true,
      result: {
        summary: {
          totalMethods: methods.length,
          methodsByType: Object.fromEntries(
            Object.entries(methodsByType).map(([type, items]) => [type, items.length])
          ),
          lastIndexed: stats.lastIndexed,
        },
        methodsByType,
        allMethods: methods,
      },
      message: `Retrieved ${methods.length} methods`,
    }
  }

  private async getPaths(): Promise<ToolResponse> {
    const paths = this.indexer.getAllPaths()
    const stats = this.indexer.getProjectStats()

    const pathsByMethod = paths.reduce((acc, path) => {
      if (!acc[path.method]) acc[path.method] = []
      acc[path.method].push(path)
      return acc
    }, {} as Record<string, any[]>)

    return {
      success: true,
      result: {
        summary: {
          totalPaths: paths.length,
          pathsByMethod: Object.fromEntries(
            Object.entries(pathsByMethod).map(([method, items]) => [method, items.length])
          ),
          lastIndexed: stats.lastIndexed,
        },
        pathsByMethod,
        allPaths: paths,
      },
      message: `Retrieved ${paths.length} API paths`,
    }
  }

  private async getStats(): Promise<ToolResponse> {
    const stats = this.indexer.getProjectStats()

    return {
      success: true,
      result: stats,
      message: 'Project statistics retrieved',
    }
  }
}

// CLI interface
async function main() {
  const indexer = new SimpleProjectIndexer()
  await indexer.initialize()

  logger.info('🚀 Simple Project Indexer ready!')
  logger.info('Available tools: analyze_project, search_methods, find_dependencies, generate_graph, get_files, get_methods, get_paths, get_stats')

  // Handle command line arguments
  if (process.argv.length > 2) {
    const tool = process.argv[2]
    const argsString = process.argv[3] || '{}'
    
    try {
      const args = JSON.parse(argsString)
      const result = await indexer.handleRequest({ tool, args })
      console.log(JSON.stringify(result, null, 2))
    } catch (error) {
      logger.error(`Error: ${error}`)
      process.exit(1)
    }
  } else {
    logger.info('Usage: node simple-server.js <tool> <args>')
    logger.info('Example: node simple-server.js analyze_project \'{"projectPath": "../"}\'')
  }
}

// Handle stdin for MCP-like communication
if (process.stdin.isTTY) {
  main().catch((error) => logger.error(`Main execution error: ${error}`))
} else {
  const indexer = new SimpleProjectIndexer()
  indexer.initialize().then(() => {
    logger.info('🚀 Simple Project Indexer ready for stdin input!')
    
    process.stdin.setEncoding('utf8')
    let buffer = ''
    
    process.stdin.on('data', async (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line)
            const result = await indexer.handleRequest(request)
            console.log(JSON.stringify(result))
          } catch (error) {
            console.log(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              message: 'Invalid request format',
            }))
          }
        }
      }
    })
  })
}
