import { promises as fs } from 'node:fs'
import type { MethodInfo, PathInfo, Dependency, Parameter } from './types.js'
import { PathResolver } from './path-resolver.js'

export class CodeParser {
  private pathResolver: PathResolver | null = null

  setPathResolver(pathResolver: PathResolver): void {
    this.pathResolver = pathResolver
  }

  async parseFile(filePath: string): Promise<{
    methods: MethodInfo[]
    paths: PathInfo[]
    dependencies: Dependency[]
  }> {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    
    const methods: MethodInfo[] = []
    const paths: PathInfo[] = []
    const dependencies: Dependency[] = []

    this.parseImports(content, filePath, dependencies)
    this.parseMethods(content, filePath, methods)
    this.parsePaths(content, filePath, paths)

    return { methods, paths, dependencies }
  }

  private parseImports(content: string, filePath: string, dependencies: Dependency[]): void {
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // ES6 imports
      const importMatch = line.match(/^\s*import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/)
      if (importMatch) {
        const originalImportPath = importMatch[1]
        let resolvedPath = originalImportPath

        // Use path resolver if available
        if (this.pathResolver) {
          const resolved = this.pathResolver.resolveImportPath(originalImportPath, filePath)
          if (resolved) {
            resolvedPath = resolved // Keep absolute path, don't normalize
          }
        }


        dependencies.push({
          from: filePath,
          to: originalImportPath,
          resolvedTo: resolvedPath,
          type: 'import',
          file: filePath,
          line: index + 1,
        })
      }

      // CommonJS require
      const requireMatch = line.match(/require\s*\(['"`]([^'"`]+)['"`]\)/)
      if (requireMatch) {
        const originalImportPath = requireMatch[1]
        let resolvedPath = originalImportPath

        // Use path resolver if available
        if (this.pathResolver) {
          const resolved = this.pathResolver.resolveImportPath(originalImportPath, filePath)
          if (resolved) {
            resolvedPath = this.pathResolver.normalizeFilePath(resolved)
          }
        }

        dependencies.push({
          from: filePath,
          to: originalImportPath,
          resolvedTo: resolvedPath,
          type: 'import',
          file: filePath,
          line: index + 1,
        })
      }
    })
  }

  private parseMethods(content: string, filePath: string, methods: MethodInfo[]): void {
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Function declarations
      const functionMatch = trimmedLine.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/)
      if (functionMatch) {
        methods.push({
          name: functionMatch[1],
          type: 'function',
          file: filePath,
          line: index + 1,
          column: line.indexOf('function'),
          parameters: this.parseParameters(functionMatch[2]),
          returnType: functionMatch[3]?.trim(),
          isAsync: trimmedLine.includes('async'),
          signature: trimmedLine,
        })
      }

      // Arrow functions
      const arrowMatch = trimmedLine.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*([^=]+?))?\s*=>/)
      if (arrowMatch) {
        methods.push({
          name: arrowMatch[1],
          type: 'function',
          file: filePath,
          line: index + 1,
          column: line.indexOf(arrowMatch[1]),
          parameters: this.parseParameters(arrowMatch[2]),
          returnType: arrowMatch[3]?.trim(),
          isAsync: trimmedLine.includes('async'),
          signature: trimmedLine,
        })
      }

      // Class declarations
      const classMatch = trimmedLine.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/)
      if (classMatch) {
        methods.push({
          name: classMatch[1],
          type: 'class',
          file: filePath,
          line: index + 1,
          column: line.indexOf('class'),
          signature: trimmedLine,
        })
      }

      // Interface declarations
      const interfaceMatch = trimmedLine.match(/^(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/)
      if (interfaceMatch) {
        methods.push({
          name: interfaceMatch[1],
          type: 'interface',
          file: filePath,
          line: index + 1,
          column: line.indexOf('interface'),
          signature: trimmedLine,
        })
      }

      // Type declarations
      const typeMatch = trimmedLine.match(/^(?:export\s+)?type\s+(\w+)\s*=/)
      if (typeMatch) {
        methods.push({
          name: typeMatch[1],
          type: 'type',
          file: filePath,
          line: index + 1,
          column: line.indexOf('type'),
          signature: trimmedLine,
        })
      }

      // Enum declarations
      const enumMatch = trimmedLine.match(/^(?:export\s+)?enum\s+(\w+)/)
      if (enumMatch) {
        methods.push({
          name: enumMatch[1],
          type: 'enum',
          file: filePath,
          line: index + 1,
          column: line.indexOf('enum'),
          signature: trimmedLine,
        })
      }

      // Method declarations (inside classes)
      const methodMatch = trimmedLine.match(/^(?:(private|protected|public)\s+)?(?:(static)\s+)?(?:(async)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/)
      if (methodMatch && !trimmedLine.includes('function') && !trimmedLine.includes('=')) {
        methods.push({
          name: methodMatch[4],
          type: 'method',
          file: filePath,
          line: index + 1,
          column: line.indexOf(methodMatch[4]),
          parameters: this.parseParameters(methodMatch[5]),
          returnType: methodMatch[6]?.trim(),
          visibility: methodMatch[1] as 'public' | 'private' | 'protected' || 'public',
          isStatic: !!methodMatch[2],
          isAsync: !!methodMatch[3],
          signature: trimmedLine,
        })
      }
    })
  }

  private parsePaths(content: string, filePath: string, paths: PathInfo[]): void {
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // Hono.js route patterns
      const honoMatch = line.match(/\.(?:get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/)
      if (honoMatch) {
        const method = line.match(/\.(\w+)\s*\(/)?.[1].toUpperCase() as any
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)) {
          paths.push({
            path: honoMatch[1],
            method,
            file: filePath,
            line: index + 1,
          })
        }
      }

      // Express.js route patterns
      const expressMatch = line.match(/\.(?:get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/)
      if (expressMatch) {
        const method = line.match(/\.(\w+)\s*\(/)?.[1].toUpperCase() as any
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)) {
          paths.push({
            path: expressMatch[1],
            method,
            file: filePath,
            line: index + 1,
          })
        }
      }

      // FastAPI/decorator patterns
      const decoratorMatch = line.match(/@(?:get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/)
      if (decoratorMatch) {
        const method = line.match(/@(\w+)\s*\(/)?.[1].toUpperCase() as any
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)) {
          paths.push({
            path: decoratorMatch[1],
            method,
            file: filePath,
            line: index + 1,
          })
        }
      }
    })
  }

  private parseParameters(paramString: string): Parameter[] {
    if (!paramString.trim()) return []
    
    return paramString.split(',').map(param => {
      const trimmed = param.trim()
      const match = trimmed.match(/(\w+)(\?)?\s*:\s*([^=]+)(?:\s*=\s*(.+))?/)
      
      if (match) {
        return {
          name: match[1],
          optional: !!match[2],
          type: match[3]?.trim(),
          defaultValue: match[4]?.trim(),
        }
      }
      
      // Simple parameter without type
      const simpleMatch = trimmed.match(/(\w+)(\?)?(?:\s*=\s*(.+))?/)
      if (simpleMatch) {
        return {
          name: simpleMatch[1],
          optional: !!simpleMatch[2],
          defaultValue: simpleMatch[3]?.trim(),
        }
      }
      
      return { name: trimmed }
    })
  }

  isTypeScriptFile(filePath: string): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx')
  }

  isJavaScriptFile(filePath: string): boolean {
    return filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.mjs')
  }

  shouldParseFile(filePath: string): boolean {
    return this.isTypeScriptFile(filePath) || this.isJavaScriptFile(filePath)
  }
}
