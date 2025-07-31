#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { ProjectIndexer } from './core/indexer.js'
import { CacheManager } from './cache/cache-manager.js'
import { writeFileSync, appendFileSync } from 'fs'
import { join, resolve } from 'path'

// Parse command line arguments
const args = process.argv.slice(2)
let defaultProjectPath = process.cwd()
const logEnabled = args.includes('--log')

// Log dosyasının yolunu belirle - MCP server'ın bulunduğu dizinde debug.log
const serverDir = resolve(process.argv[1], '..')
const logFilePath = join(serverDir, 'debug.log')

// Enhanced logger with file logging support
export const logger = {
  info: (message: string) => {
    const logMessage = `[INFO] ${new Date().toISOString()} - ${message}`
    if (logEnabled) {
      appendFileSync(logFilePath, logMessage + '\n', 'utf8')
    }
  },
  error: (message: string) => {
    const logMessage = `[ERROR] ${new Date().toISOString()} - ${message}`
    console.error(logMessage)
    if (logEnabled) {
      appendFileSync(logFilePath, logMessage + '\n', 'utf8')
    }
  },
  debug: (message: string) => {
    const logMessage = `[DEBUG] ${new Date().toISOString()} - ${message}`
    if (logEnabled) {
      appendFileSync(logFilePath, logMessage + '\n', 'utf8')
    }
  },
  operation: (operation: string, details?: string) => {
    const logMessage = `[OPERATION] ${new Date().toISOString()} - ${operation}${details ? ` - ${details}` : ''}`
    if (logEnabled) {
      appendFileSync(logFilePath, logMessage + '\n', 'utf8')
    }
  }
}

// Logger'ın enabled durumunu export et
export const isLogEnabled = () => logEnabled

// Log dosyasını başlat
if (logEnabled) {
  writeFileSync(logFilePath, `=== TypeScript Project Indexer MCP Log Started ===\n${new Date().toISOString()}\n\n`, 'utf8')
  logger.info(`Log sistemi aktif - Debug log dosyası: ${logFilePath}`)
  logger.info(`Root dizin: ${process.cwd()}`)
  logger.info(`Başlangıç argümanları: ${JSON.stringify(process.argv)}`)
}

// Dynamic project path - will be updated via MCP Roots protocol
let currentProjectPath = defaultProjectPath

logger.info(`TypeScript Project Indexer MCP - Default project path: ${defaultProjectPath}`)
logger.info(`Current working directory: ${process.cwd()}`)
logger.info(`Resolved project root: ${currentProjectPath}`)

// Global instance to persist data across tool calls
let globalIndexer: ProjectIndexer | null = null
let globalCache: CacheManager | null = null
let isInitialized = false

async function getOrCreateIndexer(): Promise<ProjectIndexer> {
  if (!globalIndexer) {
    globalCache = new CacheManager()
    await globalCache.init()
    globalIndexer = new ProjectIndexer(globalCache)
    await globalIndexer.initialize()
    isInitialized = true
  }
  return globalIndexer
}

class ProjectIndexerMCPServer {
  private server: Server

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-project-indexer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    )

    this.setupHandlers()
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_project',
            description: 'Analyze and index the entire project structure',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project root directory. Must be an absolute path (e.g., "/home/user/project" or "C:\\Users\\user\\project")',
                },
                includePatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File patterns to include (glob patterns)',
                  default: ['**/*.ts', '**/*.js', '**/*.json'],
                },
                excludePatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File patterns to exclude (glob patterns)',
                  default: [
                    'node_modules/**', 
                    'dist/**', 
                    '**/*.d.ts',
                    '.git/**',
                    'plugged/**',
                    '.local/**',
                    'cache/**',
                    'tmp/**',
                    'temp/**',
                    'build/**',
                    'coverage/**',
                    'test/**',
                    'tests/**',
                    '__tests__/**',
                    '.pytest_cache/**',
                    '.vscode/**',
                    '.idea/**'
                  ],
                },
                forceReindex: {
                  type: 'boolean',
                  description: 'Force full reindexing even if cache exists',
                  default: false,
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'search_methods',
            description: 'Search for methods, functions, and classes in the project',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (method/function/class name or pattern)',
                },
                type: {
                  type: 'string',
                  enum: ['method', 'function', 'class', 'interface', 'type', 'all'],
                  description: 'Type of definition to search for',
                  default: 'all',
                },
                includeUsages: {
                  type: 'boolean',
                  description: 'Include usage locations in the results',
                  default: false,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_project_files',
            description: 'Get list of all indexed project files',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'get_project_stats',
            description: 'Get project statistics',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'find_usages',
            description: 'Find where a file, method, or class is imported or used',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the file to find imports/usages for (e.g., "src/config.ts")',
                },
                methodName: {
                  type: 'string',
                  description: 'Name of the method/function to find usages for',
                },
                className: {
                  type: 'string',
                  description: 'Name of the class to find usages for',
                },
                searchType: {
                  type: 'string',
                  enum: ['imports', 'usages', 'both'],
                  description: 'Type of search: imports (where file is imported), usages (where method/class is used), or both',
                  default: 'imports',
                },
                includeDetails: {
                  type: 'boolean',
                  description: 'Include detailed context information',
                  default: true,
                },
              },
              required: [],
            },
          },
          {
            name: 'debug_dependencies',
            description: 'Debug dependencies to see what is being indexed',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of dependencies to show',
                  default: 20,
                },
                filterBy: {
                  type: 'string',
                  description: 'Filter dependencies by string match',
                },
              },
              required: [],
            },
          },
        ],
      }
    })

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        const indexer = await getOrCreateIndexer()

        switch (name) {
          case 'analyze_project':
            return await this.analyzeProject(indexer, args || {})
          case 'search_methods':
            return await this.searchMethods(indexer, args as any)
          case 'get_project_files':
            return await this.getProjectFiles(indexer)
          case 'get_project_stats':
            return await this.getProjectStats(indexer)
          case 'find_usages':
            return await this.findUsages(indexer, args as any)
          case 'debug_dependencies':
            return await this.debugDependencies(indexer, args as any)
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${message}`)
      }
    })

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'project://files',
            name: 'Project Files',
            description: 'List of all indexed project files with metadata',
            mimeType: 'application/json',
          },
          {
            uri: 'project://methods',
            name: 'Project Methods',
            description: 'Index of all methods, functions, and classes',
            mimeType: 'application/json',
          },
        ],
      }
    })

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params

      try {
        const indexer = await getOrCreateIndexer()

        switch (uri) {
          case 'project://files':
            return await this.getProjectFilesResource(indexer)
          case 'project://methods':
            return await this.getProjectMethodsResource(indexer)
          default:
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new McpError(ErrorCode.InternalError, `Resource read failed: ${message}`)
      }
    })
  }

  private async analyzeProject(indexer: ProjectIndexer, args: any) {
    const {
      projectPath,
      includePatterns = ['**/*.ts', '**/*.js', '**/*.json'],
      excludePatterns = ['node_modules/**', 'dist/**', '**/*.d.ts'],
      forceReindex = false,
    } = args
    
    logger.operation('MCP Tool: analyze_project called', `Path: ${projectPath}, ForceReindex: ${forceReindex}`)
    logger.info(`🔍 Starting project analysis with path: ${projectPath}`)
    logger.info(`💼 Process working directory: ${process.cwd()}`)
    logger.debug(`Include patterns: ${includePatterns.join(', ')}`)
    logger.debug(`Exclude patterns: ${excludePatterns.join(', ')}`)
    
    const toolStartTime = Date.now()
    const result = await indexer.analyzeProject({
      projectPath,
      includePatterns,
      excludePatterns,
      forceReindex,
    })
    const toolDuration = Date.now() - toolStartTime
    
    logger.operation('MCP Tool: analyze_project completed', 
      `Total duration: ${toolDuration}ms, IndexingTime: ${result.duration}ms, Results: ${result.totalFiles} files, ${result.totalMethods} methods, ${result.totalPaths} paths, ${result.totalDependencies} dependencies`)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            result,
            message: `Project analysis complete! Found ${result.totalFiles} files, ${result.totalMethods} methods, ${result.totalPaths} paths, and ${result.totalDependencies} dependencies in ${result.duration}ms.`,
          }, null, 2),
        },
      ],
    }
  }

  private async searchMethods(indexer: ProjectIndexer, args: any) {
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

  private async getProjectFiles(indexer: ProjectIndexer) {
    const files = indexer.getAllFiles()
    const stats = indexer.getProjectStats()

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
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
          }, null, 2),
        },
      ],
    }
  }

  private async getProjectStats(indexer: ProjectIndexer) {
    const stats = indexer.getProjectStats()

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            result: stats,
            message: 'Project statistics retrieved',
          }, null, 2),
        },
      ],
    }
  }

  private async findUsages(indexer: ProjectIndexer, args: any) {
    const { filePath, methodName, className, searchType = 'imports', includeDetails = true } = args

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

  private async debugDependencies(indexer: ProjectIndexer, args: any) {
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
            message: `Showing ${limitedDeps.length} dependencies ${filterBy ? `filtered by "${filterBy}"` : ''}`,
          }, null, 2),
        },
      ],
    }
  }


  private async getProjectFilesResource(indexer: ProjectIndexer) {
    const files = indexer.getAllFiles()
    const stats = indexer.getProjectStats()

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

  private async getProjectMethodsResource(indexer: ProjectIndexer) {
    const methods = indexer.getAllMethods()
    const stats = indexer.getProjectStats()

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

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    await getOrCreateIndexer() // Initialize global indexer
    logger.info('🚀 TypeScript Project Indexer MCP server started!')
  }

  async stop() {
    await this.server.close()
  }
}

// Start the server
const server = new ProjectIndexerMCPServer()

process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down TypeScript Project Indexer MCP server...')
  await server.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down TypeScript Project Indexer MCP server...')
  await server.stop()
  process.exit(0)
})

server.start().catch((error) => {
  logger.error(`❌ Failed to start TypeScript Project Indexer MCP server: ${error}`)
  process.exit(1)
})
