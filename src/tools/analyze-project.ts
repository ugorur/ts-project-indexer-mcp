import type { ProjectIndexer } from '../core/indexer.js'
import { isAbsolute } from 'path'

export interface AnalyzeProjectArgs {
  projectPath: string
  includePatterns?: string[]
  excludePatterns?: string[]
  forceReindex?: boolean
}

export async function analyzeProjectTool(indexer: ProjectIndexer, args: AnalyzeProjectArgs) {
  const {
    projectPath,
    includePatterns = ['**/*.ts', '**/*.js', '**/*.json'],
    excludePatterns = ['node_modules/**', 'dist/**', '**/*.d.ts'],
    forceReindex = false,
  } = args

  // Validate that projectPath is an absolute path
  if (!isAbsolute(projectPath)) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Project path must be an absolute path',
            message: `Invalid project path: "${projectPath}". Please provide an absolute path (e.g., "/home/user/project" or "C:\\Users\\user\\project").`,
          }, null, 2),
        },
      ],
    }
  }

  const result = await indexer.analyzeProject({
    projectPath,
    includePatterns,
    excludePatterns,
    forceReindex,
  })

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
