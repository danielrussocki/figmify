import { createImportWebDesign } from './src/application/import-web-design'
import type { InterfaceMessage } from './src/contracts/messages'
import { requestFigmaDocument } from './src/infrastructure/api/figmify-client'
import { createDocumentRenderer, type TemporaryRootNode, type TemporaryRootPage } from './src/infrastructure/figma/document-renderer'
import { createFontCatalog } from './src/infrastructure/figma/font-catalog'
import { createPageReader } from './src/infrastructure/figma/page-reader'
import { createResourceLoader } from './src/infrastructure/figma/resource-loader'

figma.showUI(__html__)

const documentRenderer = createDocumentRenderer(figma)
const application = createImportWebDesign({
  postMessage: (message) => figma.ui.postMessage(message),
  pageReader: createPageReader(figma),
  requestFigmaDocument,
  fontCatalog: createFontCatalog(figma),
  resourceLoader: createResourceLoader(figma),
  renderer: {
    createTemporaryRoot: (pageId) => {
      const page = figma.root.children.find((candidate) => candidate.id === pageId)
      if (page === undefined) {
        throw new Error('The import page is no longer available.')
      }
      return documentRenderer.createTemporaryRoot(page as unknown as TemporaryRootPage)
    },
    renderCompleteTree: (plan, temporaryRoot) => documentRenderer.renderCompleteTree(plan, temporaryRoot as TemporaryRootNode),
    confirmTemporaryRoot: (temporaryRoot, destination) => documentRenderer.confirmTemporaryRoot(temporaryRoot as TemporaryRootNode, destination),
    removeTemporaryRoot: (temporaryRoot) => documentRenderer.removeTemporaryRoot(temporaryRoot as TemporaryRootNode),
  },
})

figma.ui.onmessage = (message: InterfaceMessage): void => {
  application.handleMessage(message)
}
