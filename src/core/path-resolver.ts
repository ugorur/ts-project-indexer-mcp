import { promises as fs } from 'node:fs'
import { join, resolve, relative, dirname, basename, extname } from 'node:path'

export interface TsConfig {
  compilerOptions?: {
    baseUrl?: string
    rootDir?: string
    outDir?: string
    paths?: Record<string, string[]>
  }
}

export interface PackageJson {
  imports?: Record<string, string>
}

export class PathResolver {
  private projectRoot: string
  private tsConfig: TsConfig | null = null
  private packageJson: PackageJson | null = null
  private pathMappings: Map<string, string> = new Map()

  constructor(projectRoot: string) {
    this.projectRoot = resolve(projectRoot)
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.loadTsConfig(),
      this.loadPackageJson(),
    ])
    this.buildPathMappings()
  }

  /**
   * Resolve an import path to absolute file path
   */
  resolveImportPath(importPath: string, fromFile: string): string | null {
    const fromDir = dirname(fromFile)

    // Handle different import types
    if (importPath.startsWith('#')) {
      // Package imports (#root/*)
      return this.resolvePackageImport(importPath)
    } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Relative imports
      return this.resolveRelativeImport(importPath, fromDir)
    } else if (importPath.startsWith('/')) {
      // Absolute imports (rare)
      return this.resolveAbsoluteImport(importPath)
    } else if (this.tsConfig?.compilerOptions?.paths) {
      // TypeScript path mapping
      return this.resolvePathMapping(importPath)
    }

    // Node modules or other external imports
    return null
  }

  /**
   * Normalize a file path to the project-relative format
   */
  normalizeFilePath(filePath: string): string {
    const absolutePath = resolve(filePath)
    const relativePath = relative(this.projectRoot, absolutePath)
    return relativePath.replace(/\\/g, '/')
  }

  /**
   * Get possible file extensions for resolution
   */
  private getPossibleExtensions(): string[] {
    return ['.ts', '.js', '.tsx', '.jsx', '.json']
  }

  /**
   * Resolve package imports like #root/*
   */
  private resolvePackageImport(importPath: string): string | null {
    if (!this.packageJson?.imports) return null

    for (const [pattern, target] of Object.entries(this.packageJson.imports)) {
      if (this.matchesPattern(importPath, pattern)) {
        let resolvedPath = this.replacePattern(importPath, pattern, target)
        
        // Convert dist/* to src/* for development-time resolution
        if (resolvedPath.startsWith('./dist/')) {
          resolvedPath = resolvedPath.replace('./dist/', './src/')
        } else if (resolvedPath.startsWith('dist/')) {
          resolvedPath = resolvedPath.replace('dist/', 'src/')
        }
        
        const absolutePath = resolve(this.projectRoot, resolvedPath)
        return this.resolveToExistingFile(absolutePath)
      }
    }
    return null
  }

  /**
   * Resolve relative imports like ../../config
   */
  private resolveRelativeImport(importPath: string, fromDir: string): string | null {
    const basePath = resolve(fromDir, importPath)
    return this.resolveToExistingFile(basePath)
  }

  /**
   * Resolve absolute imports
   */
  private resolveAbsoluteImport(importPath: string): string | null {
    return this.resolveToExistingFile(importPath)
  }

  /**
   * Resolve TypeScript path mappings
   */
  private resolvePathMapping(importPath: string): string | null {
    if (!this.tsConfig?.compilerOptions?.paths) return null

    const baseUrl = this.tsConfig.compilerOptions.baseUrl || '.'
    const baseDir = resolve(this.projectRoot, baseUrl)

    for (const [pattern, targets] of Object.entries(this.tsConfig.compilerOptions.paths)) {
      if (this.matchesPattern(importPath, pattern)) {
        for (const target of targets) {
          let resolvedPath = this.replacePattern(importPath, pattern, target)
          
          // Handle relative paths in tsconfig.json targets
          if (resolvedPath.startsWith('./')) {
            resolvedPath = resolvedPath.substring(2) // Remove "./"
          }
          
          const fullPath = resolve(baseDir, resolvedPath)
          const existingFile = this.resolveToExistingFile(fullPath)
          if (existingFile) return existingFile
        }
      }
    }
    return null
  }

  /**
   * Try to find existing file with different extensions
   */
  private resolveToExistingFile(basePath: string): string | null {
    // Remove existing extension if any
    const withoutExt = basePath.replace(/\.(js|ts|jsx|tsx|json)$/, '')

    // For .js imports, try .ts first (most common in our TypeScript project)
    if (basePath.endsWith('.js')) {
      const tsPath = withoutExt + '.ts'
      return tsPath // Return .ts version for .js imports
    }

    // For imports without extension, prefer .ts over .js
    if (!basePath.match(/\.(js|ts|jsx|tsx|json)$/)) {
      // Check if this looks like a TypeScript project file (within src/ or project root)
      if (basePath.includes('/src/') || relative(this.projectRoot, basePath).startsWith('src/')) {
        return withoutExt + '.ts'
      }
      // For other files, try .js
      return withoutExt + '.js'
    }

    // Return original path if it already has an extension
    return basePath
  }

  /**
   * Check if import path matches a pattern like "#root/*"
   */
  private matchesPattern(importPath: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return importPath === pattern
    }

    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
      .replace(/\\\*/g, '.*') // Replace \* with .*

    return new RegExp(`^${regexPattern}$`).test(importPath)
  }

  /**
   * Replace pattern wildcards with actual values
   */
  private replacePattern(importPath: string, pattern: string, target: string): string {
    if (!pattern.includes('*') || !target.includes('*')) {
      return target
    }

    // Extract the wildcard part
    const patternPrefix = pattern.split('*')[0]
    const patternSuffix = pattern.split('*')[1] || ''
    
    if (!importPath.startsWith(patternPrefix)) return target

    let wildcardValue = importPath.slice(patternPrefix.length)
    if (patternSuffix && wildcardValue.endsWith(patternSuffix)) {
      wildcardValue = wildcardValue.slice(0, -patternSuffix.length)
    }

    return target.replace('*', wildcardValue)
  }

  /**
   * Load TypeScript configuration
   */
  private async loadTsConfig(): Promise<void> {
    this.tsConfig = await this.findFileInParentDirs('tsconfig.json')
  }

  /**
   * Load package.json configuration
   */
  private async loadPackageJson(): Promise<void> {
    this.packageJson = await this.findFileInParentDirs('package.json')
  }

  /**
   * Search for a file in project directory and limited parent directories
   */
  private async findFileInParentDirs(filename: string): Promise<any> {
    let currentDir = this.projectRoot
    const projectRootResolved = resolve(this.projectRoot)
    
    // First try in the project root itself
    const projectFilePath = join(currentDir, filename)
    try {
      const content = await fs.readFile(projectFilePath, 'utf8')
      return JSON.parse(content)
    } catch {
      // Not found in project root
    }
    
    // Only check up to 2 levels above project root (for monorepos)
    let levelsUp = 0
    const maxLevelsUp = 2
    
    while (levelsUp < maxLevelsUp) {
      const parentDir = join(currentDir, '..')
      const parentDirResolved = resolve(parentDir)
      
      // Stop if we've reached the root directory or gone too far up
      if (parentDirResolved === resolve(currentDir)) {
        break
      }
      
      const filePath = join(parentDir, filename)
      try {
        const content = await fs.readFile(filePath, 'utf8')
        return JSON.parse(content)
      } catch {
        // File not found, continue to next parent
      }
      
      currentDir = parentDir
      levelsUp++
    }
    
    return null
  }

  /**
   * Build internal path mappings for quick lookup
   */
  private buildPathMappings(): void {
    this.pathMappings.clear()

    // Add TypeScript path mappings
    if (this.tsConfig?.compilerOptions?.paths) {
      for (const [pattern, targets] of Object.entries(this.tsConfig.compilerOptions.paths)) {
        // For now, just use the first target
        if (targets.length > 0) {
          this.pathMappings.set(pattern, targets[0])
        }
      }
    }

    // Add package.json imports
    if (this.packageJson?.imports) {
      for (const [pattern, target] of Object.entries(this.packageJson.imports)) {
        this.pathMappings.set(pattern, target)
      }
    }
  }

  /**
   * Debug method to inspect current configuration
   */
  getDebugInfo(): any {
    return {
      projectRoot: this.projectRoot,
      tsConfig: this.tsConfig,
      packageJson: this.packageJson,
      pathMappings: Array.from(this.pathMappings.entries()),
    }
  }
}
