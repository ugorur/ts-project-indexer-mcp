import type { ProjectIndexer } from '#/core/indexer.js'

export interface AnalyzeProjectArgs {
  projectPath?: string
  includePatterns?: string[]
  excludePatterns?: string[]
  forceReindex?: boolean
}

export async function analyzeProjectTool(indexer: ProjectIndexer, args: AnalyzeProjectArgs) {
  const {
    projectPath = '../',
    includePatterns = ['**/*.ts', '**/*.js', '**/*.json'],
    excludePatterns = ['node_modules/**', 'dist/**', '**/*.d.ts'],
    forceReindex = false,
  } = args

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
