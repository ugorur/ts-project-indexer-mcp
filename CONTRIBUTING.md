# Contributing to TypeScript Project Indexer MCP

We welcome contributions to the TypeScript Project Indexer MCP! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or pnpm
- TypeScript knowledge
- Familiarity with MCP (Model Context Protocol)

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/ugorur/ts-project-indexer-mcp.git
   cd ts-project-indexer-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run in development mode**
   ```bash
   npm run dev
   ```

## 📝 Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow existing code style and conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Maintain consistent indentation (2 spaces)

### Architecture Principles

- **Separation of Concerns**: Keep parsing, indexing, and MCP logic separate
- **Performance First**: Optimize for large codebases
- **Cross-Platform**: Ensure compatibility across operating systems
- **Error Handling**: Implement robust error handling and recovery
- **Caching**: Use intelligent caching to improve performance

### File Structure

```
src/
├── core/           # Core analysis engine
│   ├── indexer.ts     # Main project indexer
│   ├── parser.ts      # Code parsing logic
│   ├── path-resolver.ts # Import/export resolution
│   └── types.ts       # Type definitions
├── cache/          # Caching layer
├── tools/          # MCP tool implementations
├── resources/      # MCP resource providers
└── mcp-server.ts   # Main MCP server
```

## 🐛 Bug Reports

When reporting bugs, please include:

- **Environment**: OS, Node.js version, package version
- **Steps to Reproduce**: Clear steps to recreate the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Code Sample**: Minimal code that demonstrates the issue
- **Error Messages**: Full error messages and stack traces

### Bug Report Template

```markdown
**Environment:**
- OS: [e.g., macOS 14.0, Windows 11, Ubuntu 22.04]
- Node.js: [e.g., 18.19.0]
- Package Version: [e.g., 1.0.0]

**Description:**
A clear description of the bug.

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What you expected to happen.

**Actual Behavior:**
What actually happened.

**Error Messages:**
```
Paste any error messages here
```

**Additional Context:**
Any other relevant information.
```

## ✨ Feature Requests

When requesting features, please include:

- **Use Case**: Why is this feature needed?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other ways to solve the problem
- **Implementation Ideas**: Technical approach (if you have thoughts)

### Feature Request Template

```markdown
**Feature Description:**
A clear description of the feature you'd like to see.

**Use Case:**
Why would this feature be useful? What problem does it solve?

**Proposed Solution:**
How do you think this feature should work?

**Alternatives:**
Are there other ways to achieve the same goal?

**Additional Context:**
Any other relevant information, mockups, or examples.
```

## 🔧 Pull Requests

### Before Submitting

- [ ] Fork the repository and create a feature branch
- [ ] Update documentation if needed
- [ ] Follow the code style guidelines
- [ ] Add yourself to contributors if it's your first contribution

### Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, well-documented code
   - Update documentation as needed

3. **Build Your Changes**
   ```bash
   npm run build
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

Use conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(parser): add support for JSX files
fix(indexer): resolve path resolution issue on Windows
docs(readme): update installation instructions
```

### Code Review

All pull requests require code review. Please:

- Be responsive to feedback
- Make requested changes promptly
- Explain your approach when asked
- Be patient and respectful

## 🎯 Areas for Contribution

### High Priority
- **Performance Improvements**: Optimize parsing and indexing
- **Language Support**: Add JSX/TSX support
- **Error Handling**: Improve error messages and recovery
- **Cross-Platform**: Fix platform-specific issues

### Medium Priority
- **Testing**: Increase test coverage
- **Documentation**: Improve examples and guides
- **Features**: Add new analysis capabilities
- **CLI Tool**: Create standalone CLI interface

### Good First Issues
- **Bug Fixes**: Fix small, well-defined bugs
- **Documentation**: Update README, add examples
- **Tests**: Write tests for existing functionality
- **Refactoring**: Clean up code, improve readability

## 📚 Resources

### Learning Resources
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [TypeScript AST Explorer](https://ts-ast-viewer.com/)
- [TypeScript Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)

### Project Resources
- [GitHub Issues](https://github.com/ugorur/ts-project-indexer-mcp/issues)
- [GitHub Discussions](https://github.com/ugorur/ts-project-indexer-mcp/discussions)
- [Project Roadmap](https://github.com/ugorur/ts-project-indexer-mcp/projects)

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community discussion
- **Email**: For private matters (see package.json for contact info)

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for contributing to TypeScript Project Indexer MCP! 🎉
