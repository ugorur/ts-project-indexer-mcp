import type { ProjectIndexer } from '../core/indexer.js'

export interface GenerateGraphArgs {
  format?: 'mermaid' | 'dot' | 'json'
  scope?: 'full' | 'services' | 'controllers' | 'types'
  maxNodes?: number
}

export async function generateGraphTool(indexer: ProjectIndexer, args: GenerateGraphArgs = {}) {
  const { format = 'json', scope = 'services', maxNodes = 50 } = args

  const allMethods = indexer.getAllMethods()
  const allDependencies = indexer.getAllDependencies()

  const filteredMethods = allMethods.filter(method => {
    switch (scope) {
      case 'services':
        return method.file.includes('/services/') || method.file.includes('\\services\\')
      case 'controllers':
        return method.file.includes('/controllers/') || method.file.includes('\\controllers\\') || 
               method.file.includes('/routes/') || method.file.includes('\\routes\\')
      case 'types':
        return method.type === 'interface' || method.type === 'type' || method.type === 'enum'
      case 'full':
      default:
        return true
    }
  }).slice(0, maxNodes)

  let graphContent = JSON.stringify({
    nodes: filteredMethods.map(m => ({ id: m.name, type: m.type, file: m.file })),
    edges: allDependencies.map(d => ({ from: d.from, to: d.to, type: d.type })),
  }, null, 2)

  if (format === 'mermaid') {
    const lines = ['graph TD']
    for (const method of filteredMethods) {
      const nodeId = method.name.replace(/[^a-zA-Z0-9_]/g, '_')
      lines.push(`    ${nodeId}["${method.name}[${method.type}]"]`)
    }
    graphContent = lines.join('\n')
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          result: {
            format,
            scope,
            nodeCount: filteredMethods.length,
            edgeCount: allDependencies.length,
            graph: graphContent,
          },
          message: `Generated ${format} graph with ${filteredMethods.length} nodes and ${allDependencies.length} edges`,
        }, null, 2),
      },
    ],
  }
}
