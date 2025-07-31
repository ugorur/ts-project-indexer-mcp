export interface FileInfo {
  path: string
  name: string
  extension: string
  size: number
  lastModified: Date
  isDirectory: boolean
  relativePath: string
}

export interface MethodInfo {
  name: string
  type: 'function' | 'method' | 'class' | 'interface' | 'type' | 'enum' | 'variable'
  file: string
  line: number
  column: number
  parameters?: Parameter[]
  returnType?: string
  visibility?: 'public' | 'private' | 'protected'
  isStatic?: boolean
  isAsync?: boolean
  decorators?: string[]
  comments?: string
  signature: string
}

export interface Parameter {
  name: string
  type?: string
  optional?: boolean
  defaultValue?: string
}

export interface PathInfo {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  file: string
  line: number
  handler?: string
  middleware?: string[]
  parameters?: RouteParameter[]
}

export interface RouteParameter {
  name: string
  type: 'path' | 'query' | 'body' | 'header'
  required?: boolean
  description?: string
}

export interface Dependency {
  from: string
  to: string
  resolvedTo?: string // Resolved absolute path for imports
  type: 'import' | 'call' | 'extends' | 'implements' | 'uses'
  file: string
  line: number
}

export interface IndexData {
  files: Map<string, FileInfo>
  methods: Map<string, MethodInfo[]>
  paths: Map<string, PathInfo[]>
  dependencies: Map<string, Dependency[]>
  lastIndexed: Date
}

export interface SearchResult<T> {
  items: T[]
  totalCount: number
  query: string
  searchTime: number
}

export interface AnalysisOptions {
  includePatterns: string[]
  excludePatterns: string[]
  projectPath: string
  forceReindex: boolean
}

export interface CacheEntry<T> {
  data: T
  timestamp: Date
  ttl?: number
}
