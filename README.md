# TypeScript Project Indexer MCP

A powerful **MCP (Model Context Protocol)** server that indexes and analyzes TypeScript/JavaScript projects, providing intelligent code exploration, dependency tracking, method discovery, and project structure analysis for AI assistants and development tools.

## 🚀 Features

- **🔍 Project Analysis**: Deep analysis of TypeScript/JavaScript codebases
- **📊 Method Discovery**: Find functions, classes, interfaces, and types across your project
- **🔗 Dependency Tracking**: Track imports, exports, and module dependencies
- **📁 File Indexing**: Comprehensive file structure analysis with metadata
- **🔎 Smart Search**: Powerful search capabilities for code elements
- **⚡ Performance Optimized**: Efficient caching and batch processing
- **🌐 Cross-Platform**: Works on Windows, macOS, and Linux
- **🤖 AI-Ready**: Perfect integration with AI assistants and development tools

## 📦 Installation

### Via npm (Recommended)

```bash
npm install -g ts-project-indexer-mcp
```

### Via Git

```bash
git clone https://github.com/ugorur/ts-project-indexer-mcp.git
cd ts-project-indexer-mcp
npm install
npm run build
```

## 🛠️ Configuration

### MCP Settings for Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "typescript-project-indexer": {
      "command": "npx",
      "args": [
        "-y",
        "ts-project-indexer-mcp"
      ],
      "env": {}
    }
  }
}
```

### MCP Settings for Cline

Add to your MCP configuration:

```json
{
  "typescript-project-indexer": {
    "autoApprove": [
      "analyze_project",
      "search_methods", 
      "get_project_files",
      "get_project_stats",
      "find_usages"
    ],
    "disabled": false,
    "timeout": 60,
    "type": "stdio",
    "command": "npx",
    "args": [
      "-y", 
      "ts-project-indexer-mcp"
    ]
  }
}
```

### Alternative: Local Installation

If you prefer to install globally:

```bash
npm install -g ts-project-indexer-mcp
```

Then use:

```json
{
  "mcpServers": {
    "typescript-project-indexer": {
      "command": "ts-project-indexer",
      "args": [],
      "env": {}
    }
  }
}
```

> **⚠️ Important Change in v1.1.0**: Project paths are no longer passed as command line arguments. Instead, use the `analyze_project` tool with an absolute `projectPath` parameter.

## 🎯 Usage Examples

### Basic Project Analysis

```javascript
// Analyze a specific project (absolute path required)
await mcp.callTool('analyze_project', {
  projectPath: '/home/user/my-project',
  includePatterns: ['**/*.ts', '**/*.js'],
  excludePatterns: ['node_modules/**', 'dist/**']
});

// Windows example
await mcp.callTool('analyze_project', {
  projectPath: 'C:\\Users\\user\\my-project',
  includePatterns: ['**/*.ts', '**/*.js'],
  excludePatterns: ['node_modules/**', 'dist/**']
});
```

### Search for Methods

```javascript
// Find all functions containing 'config'
await mcp.callTool('search_methods', {
  query: 'config',
  type: 'function',
  includeUsages: true
});
```

### Find Usage Locations

```javascript
// Find where a file is imported
await mcp.callTool('find_usages', {
  filePath: 'src/config.ts',
  searchType: 'imports',
  includeDetails: true
});
```

### Get Project Statistics

```javascript
// Get comprehensive project stats
await mcp.callTool('get_project_stats', {});
```

## 🔧 Available Tools

### `analyze_project`
Analyzes and indexes the entire project structure.

**Parameters:**
- `projectPath` (string, **required**): **Absolute path** to project root (e.g., `/home/user/project` or `C:\Users\user\project`)
- `includePatterns` (array): File patterns to include (default: `['**/*.ts', '**/*.js', '**/*.json']`)
- `excludePatterns` (array): File patterns to exclude (default: `['node_modules/**', 'dist/**', '**/*.d.ts']`)
- `forceReindex` (boolean): Force full reindexing (default: `false`)

> **⚠️ Important**: The `projectPath` parameter is required and must be an absolute path. Relative paths are not supported for security and reliability reasons.

### `search_methods`
Search for methods, functions, and classes in the project.

**Parameters:**
- `query` (string): Search query (required)
- `type` (string): Type filter (`method`, `function`, `class`, `interface`, `type`, `all`)
- `includeUsages` (boolean): Include usage locations (default: `false`)

### `find_usages`
Find where a file, method, or class is imported or used.

**Parameters:**
- `filePath` (string): Path to file to find imports/usages for
- `methodName` (string): Name of method/function to find usages for
- `className` (string): Name of class to find usages for
- `searchType` (string): Search type (`imports`, `usages`, `both`)
- `includeDetails` (boolean): Include detailed context (default: `true`)

### `get_project_files`
Get list of all indexed project files with metadata.

### `get_project_stats`
Get comprehensive project statistics.

### `debug_dependencies`
Debug dependencies to see what is being indexed.

**Parameters:**
- `limit` (number): Maximum dependencies to show (default: `20`)
- `filterBy` (string): Filter dependencies by string match

## 📚 Resources

### `project://files`
List of all indexed project files with metadata.

### `project://methods`
Index of all methods, functions, and classes.

## 💡 Use Cases

### For AI Assistants
- **Code Understanding**: Help AI understand project structure and relationships
- **Intelligent Refactoring**: Find all usages before making changes
- **Documentation Generation**: Extract comprehensive project information
- **Code Review**: Analyze dependencies and method relationships

### For Development Tools
- **IDE Integration**: Enhance code navigation and search
- **Build Tools**: Analyze project dependencies for optimization
- **Documentation Tools**: Generate API documentation automatically
- **Testing Tools**: Find test coverage gaps

### For Project Management
- **Complexity Analysis**: Understand codebase complexity
- **Dependency Mapping**: Visualize project dependencies
- **Code Metrics**: Generate comprehensive code statistics
- **Architecture Analysis**: Understand project structure

## 🏗️ Architecture

```
TypeScript Project Indexer MCP
├── Core Engine
│   ├── Project Indexer    # Main analysis engine
│   ├── Code Parser        # AST parsing and analysis
│   ├── Path Resolver      # Import/export resolution
│   └── Type System        # TypeScript type analysis
├── Caching Layer
│   ├── Memory Cache       # Fast in-memory storage
│   └── Persistent Cache   # Disk-based caching
├── MCP Server
│   ├── Tool Handlers      # MCP tool implementations
│   ├── Resource Handlers  # MCP resource providers
│   └── Protocol Layer     # MCP communication
└── Utilities
    ├── File System        # Cross-platform file operations
    ├── Pattern Matching   # Glob pattern support
    └── Error Handling     # Robust error management
```

## 🔄 Performance & Caching

- **Smart Caching**: Intelligent caching system with 24-hour retention
- **Batch Processing**: Processes files in optimized batches
- **Incremental Analysis**: Only re-analyzes changed files
- **Memory Management**: Efficient memory usage for large projects
- **Cross-Platform**: Optimized path handling for all operating systems

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/ugorur/ts-project-indexer-mcp.git
cd ts-project-indexer-mcp
npm install
npm run dev
```

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ugur Orur**
- GitHub: [@ugorur](https://github.com/ugorur)
- Project: [ts-project-indexer-mcp](https://github.com/ugorur/ts-project-indexer-mcp)

## 🙏 Acknowledgments

- Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Powered by TypeScript AST analysis
- Inspired by the need for better AI-code integration

## 📈 Roadmap

- [ ] **Language Support**: JavaScript ES6+, JSX/TSX
- [ ] **IDE Plugins**: VSCode extension
- [ ] **Advanced Analysis**: Cyclomatic complexity metrics
- [ ] **Export Formats**: JSON, XML, YAML export options
- [ ] **Real-time Updates**: File watcher integration
- [ ] **Cloud Integration**: Remote project analysis
- [ ] **Team Features**: Shared analysis results
- [ ] **Performance**: Even faster analysis for large codebases

---

**Made with ❤️ for the developer community**
