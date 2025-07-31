# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-31

### 🚀 Major Configuration Improvements

#### Changed
- **BREAKING**: Removed argument-based project path usage from MCP server
- Project paths now must be specified via the `analyze_project` tool's `projectPath` parameter
- All project paths must be absolute paths for better reliability and security
- Improved MCP client integration by removing command-line argument dependencies

#### Updated
- **Documentation**: Updated USAGE.md with new configuration examples
- **Logs**: Converted all Turkish log messages to English for international users
- **Configuration**: Simplified MCP server configuration (no more project path in args)

#### Benefits
- 🔒 **Better Security**: Absolute path requirements prevent relative path vulnerabilities
- 🔧 **Cleaner Integration**: MCP clients no longer need to specify project paths in configuration
- 🌍 **International Support**: All logging now in English
- 📊 **Flexible Usage**: Multiple projects can be analyzed in a single session

#### Migration Guide
**Before v1.1.0:**
```json
{
  "command": "npx",
  "args": ["-y", "ts-project-indexer-mcp", "/path/to/project"]
}
```

**After v1.1.0:**
```json
{
  "command": "npx", 
  "args": ["-y", "ts-project-indexer-mcp"]
}
```

Then use the `analyze_project` tool with absolute path:
```javascript
await mcp.callTool('analyze_project', {
  projectPath: '/absolute/path/to/project'
})
```

#### Technical Details
- Removed project path parsing from command line arguments
- Enhanced `analyze_project` tool to enforce absolute path validation
- Improved error messages for better debugging experience
- Streamlined server initialization process

---

## [1.0.0] - 2025-01-31

### Added
- 🚀 Initial release of TypeScript Project Indexer MCP
- 📊 **Project Analysis**: Deep analysis of TypeScript/JavaScript codebases
- 🔍 **Method Discovery**: Find functions, classes, interfaces, and types across projects
- 🔗 **Dependency Tracking**: Track imports, exports, and module dependencies
- 📁 **File Indexing**: Comprehensive file structure analysis with metadata
- 🔎 **Smart Search**: Powerful search capabilities for code elements
- ⚡ **Performance Optimized**: Efficient caching and batch processing
- 🌐 **Cross-Platform**: Full compatibility with Windows, macOS, and Linux

### Features
- **MCP Tools**:
  - `analyze_project`: Complete project structure analysis
  - `search_methods`: Method, function, and class discovery
  - `find_usages`: Import and usage tracking
  - `get_project_files`: File listing with metadata
  - `get_project_stats`: Comprehensive project statistics
  - `debug_dependencies`: Dependency debugging tools

- **MCP Resources**:
  - `project://files`: Indexed project files
  - `project://methods`: Method and class index

- **Core Engine**:
  - TypeScript/JavaScript AST parsing
  - Intelligent path resolution with recursive parent directory search
  - Smart caching system (24-hour retention)
  - Batch file processing for performance
  - Cross-platform path handling

- **Developer Experience**:
  - Comprehensive documentation
  - MIT license
  - Contributing guidelines
  - Professional README with examples
  - Clean project structure

### Technical Details
- Built with MCP (Model Context Protocol) SDK v1.17.0
- TypeScript v5.7.2 with strict mode
- Node.js 18.0.0+ support
- Efficient memory management for large projects
- Robust error handling and recovery

### Performance
- Smart caching with intelligent invalidation
- Batch processing (50 files per batch)
- Optimized for large codebases
- Memory-efficient data structures
- Fast pattern matching algorithms

### Documentation
- Comprehensive README.md with usage examples
- Contributing guidelines with development setup
- MIT license
- Professional project structure
- API documentation for all tools and resources

### Initial Release Notes
This is the initial public release of TypeScript Project Indexer MCP. The project provides a powerful foundation for AI assistants and development tools to understand and analyze TypeScript/JavaScript projects.

**Key Highlights:**
- Production-ready codebase with robust error handling
- Comprehensive documentation and examples
- Cross-platform compatibility
- High-performance analysis engine
- Clean, maintainable architecture

**Use Cases:**
- AI assistant integration for code understanding
- Development tool enhancement
- Project analysis and metrics
- Dependency tracking and visualization
- Code navigation and search

---

## Development Notes

### v1.0.0 Development Process
- Started as internal tool for BCore Backend project analysis
- Evolved into generic, reusable MCP server
- Extensive testing with large TypeScript codebases
- Path resolution improvements for complex project structures
- Performance optimizations for production use
- Documentation and examples for community adoption

### Contributors
- Ugur Orur (@ugorur) - Initial development and release

### Acknowledgments
- Built with Model Context Protocol (MCP)
- Powered by TypeScript AST analysis
- Inspired by the need for better AI-code integration
