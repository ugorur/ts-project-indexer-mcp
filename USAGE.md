# Usage Guide for TypeScript Project Indexer MCP

This guide shows you how to use TypeScript Project Indexer MCP after setting up NPM token and GitHub repository.

## 🚀 Quick Start

### Step 1: Install Globally
```bash
npm install -g ts-project-indexer-mcp
```

### Step 2: Use with MCP Client
```bash
# Basic usage - analyze current directory
ts-project-indexer ./

# Analyze specific project
ts-project-indexer /path/to/your/typescript/project
```

## 🔧 MCP Configuration Examples

### Cline Configuration
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
      "ts-project-indexer-mcp",
      "/home/user/my-project"
    ]
  }
}
```

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "typescript-project-indexer": {
      "command": "npx",
      "args": [
        "-y",
        "ts-project-indexer-mcp", 
        "/Users/user/my-project"
      ],
      "env": {}
    }
  }
}
```

## 📋 Publishing Workflow

### Initial Release
```bash
# 1. Create Git repository
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ugorur/ts-project-indexer-mcp.git
git push -u origin main

# 2. Create first release
npm run release:patch  # Creates v1.0.1
# This automatically:
# - Builds the project
# - Creates git tag
# - Pushes to GitHub
# - Triggers NPM publish via GitHub Actions
```

### Subsequent Updates
```bash
# For bug fixes
npm run release:patch  # 1.0.0 -> 1.0.1

# For new features  
npm run release:minor  # 1.0.0 -> 1.1.0

# For breaking changes
npm run release:major  # 1.0.0 -> 2.0.0
```

## 🔍 Verification Commands

### Test Package Before Publishing
```bash
# Check what will be included in NPM package
npm run pack:check

# Build and verify compilation
npm run build

# Test the CLI locally
node dist/mcp-server.js ./
```

### Check NPM Package After Publishing
```bash
# Install from NPM
npx ts-project-indexer-mcp /path/to/project

# Verify global installation
npm install -g ts-project-indexer-mcp
ts-project-indexer --version
```

## 🐛 Troubleshooting

### GitHub Actions Failures
1. **NPM Token Issues**: Ensure `NPM_TOKEN` is set in GitHub repository secrets
2. **Build Failures**: Check that `npm run build` works locally
3. **Permission Issues**: Ensure repository is public or has proper permissions

### NPM Publishing Issues
1. **Package Name Conflicts**: Package name must be unique on NPM
2. **Version Conflicts**: Cannot publish same version twice
3. **Authentication**: Ensure NPM token has publish permissions

### MCP Integration Issues
1. **Path Resolution**: Ensure project path is absolute in MCP config
2. **Permissions**: Ensure MCP client has file system access
3. **Node.js Version**: Ensure Node.js 18+ is installed

## 📊 Feature Overview

### Available Tools
- `analyze_project`: Complete project indexing
- `search_methods`: Find functions, classes, methods
- `find_usages`: Track imports and usage
- `get_project_files`: List all indexed files
- `get_project_stats`: Project statistics
- `debug_dependencies`: Debug import resolution

### Supported File Types
- TypeScript (`.ts`)
- JavaScript (`.js`)
- JSON configuration files (`.json`)

### Performance Features
- Smart caching (24-hour retention)
- Batch processing (50 files per batch)
- Memory-efficient for large projects
- Cross-platform path handling

## 🎯 Best Practices

### For Package Maintainers
1. Always test locally before releasing
2. Use semantic versioning consistently
3. Update README.md for major changes
4. Monitor GitHub Actions for build issues

### For MCP Users
1. Use absolute paths in MCP configuration
2. Set appropriate timeout values (60s recommended)
3. Enable auto-approve for frequently used tools
4. Monitor console logs for performance insights

---

**Need Help?** Open an issue at: https://github.com/ugorur/ts-project-indexer-mcp/issues
