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
import { SimpleFileWatcher } from './watchers/simple-file-watcher.js'
import { analyzeProjectTool } from './tools/analyze-project.js'
import { searchMethodsTool } from './tools/search-methods.js'
import { findDependenciesTool } from './tools/find-dependencies.js'
import { generateGraphTool } from './tools/generate-graph.js'
import { FilesResource } from './resources/files-resource.js'
import { MethodsResource } from './resources/methods-resource.js'
import { PathsResource } from './resources/paths-resource.js'

class ProjectIndexerServer {
  private server: Server
  private indexer: ProjectIndexer
  private cache: CacheManager
  private watcher: SimpleFileWatcher
  private resources: {
    files: FilesResource
    methods: MethodsResource
    paths: PathsResource
  }

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

    // Initialize core services
    this.cache = new CacheManager()
    this.indexer = new ProjectIndexer(this.cache)
    this.watcher = new SimpleFileWatcher(this.indexer)

    // Initialize resources
    this.resources = {
      files: new FilesResource(this.indexer),
      methods: new MethodsResource(this.indexer),
      paths: new PathsResource(this.indexer),
    }

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
                  description: 'Path to the project root directory',
                  default: '../',
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
                  default: ['node_modules/**', 'dist/**', '**/*.d.ts'],
                },
                forceReindex: {
                  type: 'boolean',
                  description: 'Force full reindexing even if cache exists',
                  default: false,
                },
              },
              required: [],
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
            name: 'find_dependencies',
            description: 'Find dependencies and relationships between code entities',
            inputSchema: {
              type: 'object',
              properties: {
                entityName: {
                  type: 'string',
                  description: 'Name of the method/class/function to analyze',
                },
                direction: {
                  type: 'string',
                  enum: ['incoming', 'outgoing', 'both'],
                  description: 'Direction of dependencies to find',
                  default: 'both',
                },
                depth: {
                  type: 'number',
                  description: 'Maximum depth of dependency traversal',
                  default: 2,
                  minimum: 1,
                  maximum: 10,
                },
              },
              required: ['entityName'],
            },
          },
          {
            name: 'generate_graph',
            description: 'Generate a dependency graph for visualization',
            inputSchema: {
              type: 'object',
              properties: {
                format: {
                  type: 'string',
                  enum: ['mermaid', 'dot', 'json'],
                  description: 'Output format for the graph',
                  default: 'mermaid',
                },
                scope: {
                  type: 'string',
                  enum: ['full', 'services', 'controllers', 'types'],
                  description: 'Scope of the graph to generate',
                  default: 'services',
                },
                maxNodes: {
                  type: 'number',
                  description: 'Maximum number of nodes to include',
                  default: 50,
                  minimum: 10,
                  maximum: 200,
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
        switch (name) {
          case 'analyze_project':
            return await analyzeProjectTool(this.indexer, args || {})
          case 'search_methods':
            return await searchMethodsTool(this.indexer, args as any)
          case 'find_dependencies':
            return await findDependenciesTool(this.indexer, args as any)
          case 'generate_graph':
            return await generateGraphTool(this.indexer, args || {})
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
          {
            uri: 'project://paths',
            name: 'API Paths',
            description: 'List of all API endpoints and routes',
            mimeType: 'application/json',
          },
          {
            uri: 'project://relationships',
            name: 'Code Relationships',
            description: 'Dependency relationships between code entities',
            mimeType: 'application/json',
          },
        ],
      }
    })

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params

      try {
        switch (uri) {
          case 'project://files':
            return await this.resources.files.read()
          case 'project://methods':
            return await this.resources.methods.read()
          case 'project://paths':
            return await this.resources.paths.read()
          case 'project://relationships':
            return await this.resources.methods.readRelationships()
          default:
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new McpError(ErrorCode.InternalError, `Resource read failed: ${message}`)
      }
    })
  }

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    
    // Start file watcher for real-time updates
    await this.watcher.start('../')
    
    console.error('🚀 MCP Project Indexer server started!')
  }

  async stop() {
    await this.watcher.stop()
    await this.server.close()
  }
}

// Start the server
const server = new ProjectIndexerServer()

process.on('SIGINT', async () => {
  console.error('🛑 Shutting down MCP Project Indexer server...')
  await server.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.error('🛑 Shutting down MCP Project Indexer server...')
  await server.stop()
  process.exit(0)
})

server.start().catch((error) => {
  console.error('❌ Failed to start MCP Project Indexer server:', error)
  process.exit(1)
})
