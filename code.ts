import { createImportWebDesign } from './src/application/import-web-design'
import type { InterfaceMessage } from './src/contracts/messages'
import { requestFigmaDocument } from './src/infrastructure/api/figmify-client'
import { createPageReader } from './src/infrastructure/figma/page-reader'

figma.showUI(__html__)

const application = createImportWebDesign({
  postMessage: (message) => figma.ui.postMessage(message),
  pageReader: createPageReader(figma),
  requestFigmaDocument,
})

figma.ui.onmessage = (message: InterfaceMessage): void => {
  application.handleMessage(message)
}
