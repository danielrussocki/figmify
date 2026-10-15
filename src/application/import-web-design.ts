import { hasValidApiV1Document, type FigmaDocument, type FigmaRect } from '../contracts/api-v1'
import type { ApplicationMessage, AvailableFont, FontReference, InterfaceMessage, RequestId } from '../contracts/messages'
import { createFontSubstitutionPlan, groupFontUses, type FontSubstitutionChoice, type FontUse, type FontUseGroup } from '../domain/font-substitution'
import { createImportStateMachine, type ImportStateMachine } from '../domain/import-session'
import { calculateImportDestination, requiresAppendConfirmation, type ImportDestination, type VisibleContentBounds } from '../domain/placement'
import { buildRenderPlan, type PlannedNonTypographyResource, type RenderPlanNode } from '../domain/render-plan'

export interface NonTypographyResource {
  readonly id: string
  readonly kind: 'image' | 'icon'
  readonly source: string
  readonly rect: FigmaRect
}

export type NonTypographyResourceResult =
  | { readonly id: string; readonly kind: 'resolved'; readonly imageHash: string }
  | { readonly id: string; readonly kind: 'placeholder'; readonly rect: FigmaRect; readonly label: string }

export interface StartPageReader {
  readStartPage(): { readonly id: string; readonly hasNodes: boolean }
  pageExists?(pageId: string): boolean
  getVisibleContentBounds?(pageId: string, excludingTemporaryRoot: TemporaryRoot): VisibleContentBounds | undefined
}

export interface TemporaryRoot {
  readonly id?: string
}

export interface ImportRenderer {
  createTemporaryRoot(pageId: string): TemporaryRoot
  renderCompleteTree(plan: RenderPlanNode, temporaryRoot: TemporaryRoot): Promise<void>
  confirmTemporaryRoot(temporaryRoot: TemporaryRoot, destination: ImportDestination): void
  removeTemporaryRoot(temporaryRoot: TemporaryRoot): void
}

export interface ImportFontCatalog {
  listAvailableFonts(): Promise<readonly AvailableFont[]>
  isAvailable(font: AvailableFont): Promise<boolean>
  loadFont(font?: AvailableFont): Promise<AvailableFont>
}

export interface ImportResourceLoader {
  resolve(resources: readonly NonTypographyResource[]): Promise<readonly NonTypographyResourceResult[]>
}

export interface ValidatedImport {
  readonly requestId: RequestId
  readonly startPageId: string
}

export interface ImportWebDesignDependencies {
  readonly postMessage: (message: ApplicationMessage) => void
  readonly pageReader: StartPageReader
  readonly requestFigmaDocument: (url: string, signal: AbortSignal) => Promise<unknown>
  readonly onValidatedDocument?: (document: FigmaDocument, importContext: ValidatedImport) => void
  readonly fontCatalog?: ImportFontCatalog
  readonly resourceLoader?: ImportResourceLoader
  readonly renderer?: ImportRenderer
}

export interface ImportWebDesign {
  handleMessage(message: InterfaceMessage): void
}

interface ActiveImport {
  readonly requestId: RequestId
  readonly url: string
  readonly startPageId: string
  readonly abortController: AbortController
  document?: FigmaDocument
  availableFonts?: readonly AvailableFont[]
  pendingFontGroups?: readonly FontUseGroup[]
  fontChoices: FontSubstitutionChoice[]
  usedDefaultFont: boolean
}

export function createImportWebDesign(dependencies: ImportWebDesignDependencies): ImportWebDesign {
  const stateMachine = createImportStateMachine()
  let activeImport: ActiveImport | undefined

  const startRequest = (active: ActiveImport): void => {
    dependencies.postMessage({ type: 'IMPORT_STATUS', requestId: active.requestId, status: 'processing' })
    void requestAndValidate(active, dependencies, stateMachine, () => activeImport)
  }

  return {
    handleMessage(message: InterfaceMessage): void {
      if (message.type === 'IMPORT_REQUEST') {
        const startPage = dependencies.pageReader.readStartPage()
        const needsConfirmation = requiresAppendConfirmation(startPage.hasNodes)
        if (!stateMachine.requestImport(message.requestId, needsConfirmation)) {
          return
        }

        activeImport = {
          requestId: message.requestId,
          url: message.url,
          startPageId: startPage.id,
          abortController: new AbortController(),
          fontChoices: [],
          usedDefaultFont: false,
        }

        if (needsConfirmation) {
          dependencies.postMessage({ type: 'CONFIRM_APPEND', requestId: message.requestId })
        } else {
          startRequest(activeImport)
        }
        return
      }

      if (message.type === 'FONT_SUBSTITUTION_DECISION') {
        const active = activeImport
        const pendingGroup = active?.pendingFontGroups?.[0]
        if (
          active === undefined ||
          active.requestId !== message.requestId ||
          pendingGroup === undefined ||
          !sameFont(pendingGroup.sourceFont, message.sourceFont)
        ) {
          return
        }

        void resolveFontDecision(active, message.selection, dependencies, stateMachine, () => activeImport)
        return
      }

      if (message.type === 'IMPORT_DECISION') {
        if (!stateMachine.resolveAppendDecision(message.requestId, message.decision)) {
          return
        }
        if (message.decision === 'cancel') {
          activeImport = undefined
          return
        }
        if (activeImport !== undefined && activeImport.requestId === message.requestId) {
          startRequest(activeImport)
        }
        return
      }

      if (message.type === 'CANCEL_IMPORT' || message.type === 'CLOSE_PLUGIN') {
        if (stateMachine.cancel(message.requestId) && activeImport?.requestId === message.requestId) {
          activeImport.abortController.abort()
          activeImport = undefined
        }
      }
    },
  }
}

async function requestAndValidate(
  activeImport: ActiveImport,
  dependencies: ImportWebDesignDependencies,
  stateMachine: ImportStateMachine,
  getActiveImport: () => ActiveImport | undefined,
): Promise<void> {
  let response: unknown
  try {
    response = await dependencies.requestFigmaDocument(activeImport.url, activeImport.abortController.signal)
  } catch {
    return
  }

  if (getActiveImport()?.requestId !== activeImport.requestId || stateMachine.state !== 'processing') {
    return
  }

  if (!hasValidApiV1Document(response)) {
    return
  }

  activeImport.document = response
  dependencies.onValidatedDocument?.(response, {
    requestId: activeImport.requestId,
    startPageId: activeImport.startPageId,
  })

  if (dependencies.fontCatalog !== undefined && dependencies.resourceLoader !== undefined && dependencies.renderer !== undefined) {
    await startDocumentRendering(activeImport, dependencies, stateMachine, getActiveImport)
  }
}

function sameFont(left: FontReference, right: FontReference): boolean {
  return left.family === right.family && left.style === right.style
}

function styleForWeight(weight: number): string {
  return weight >= 700 ? 'Bold' : 'Regular'
}

function collectFontUses(node: FigmaDocument['document']): readonly FontUse[] {
  return [
    ...(node.type === 'TEXT' && node.styles !== undefined
      ? [{ id: node.id, sourceFont: { family: node.styles.fontFamily, style: styleForWeight(node.styles.fontWeight) } }]
      : []),
    ...node.children.flatMap(collectFontUses),
  ]
}

function collectResources(node: FigmaDocument['document']): readonly NonTypographyResource[] {
  const source = node.fills?.find((paint) => paint.type === 'IMAGE')?.src ?? node.image?.src
  return [
    ...(source === undefined ? [] : [{
      id: node.id,
      kind: node.svg === undefined ? 'image' as const : 'icon' as const,
      source,
      rect: node.rect,
    }]),
    ...node.children.flatMap(collectResources),
  ]
}

function isActive(active: ActiveImport, stateMachine: ImportStateMachine, getActiveImport: () => ActiveImport | undefined): boolean {
  return getActiveImport()?.requestId === active.requestId && stateMachine.state === 'processing'
}

async function startDocumentRendering(
  active: ActiveImport,
  dependencies: ImportWebDesignDependencies,
  stateMachine: ImportStateMachine,
  getActiveImport: () => ActiveImport | undefined,
): Promise<void> {
  const { document } = active
  const { fontCatalog } = dependencies
  if (document === undefined || fontCatalog === undefined || !isActive(active, stateMachine, getActiveImport)) {
    return
  }

  const availableFonts = await fontCatalog.listAvailableFonts()
  if (!isActive(active, stateMachine, getActiveImport)) {
    return
  }
  active.availableFonts = availableFonts
  const groups = groupFontUses(collectFontUses(document.document))
  const unavailableGroups = (await Promise.all(groups.map(async (group) =>
    (await fontCatalog.isAvailable(group.sourceFont)) ? undefined : group,
  ))).filter((group): group is (typeof groups)[number] => group !== undefined)
  if (!isActive(active, stateMachine, getActiveImport)) {
    return
  }
  active.pendingFontGroups = unavailableGroups
  if (unavailableGroups.length > 0) {
    dependencies.postMessage({
      type: 'FONT_SUBSTITUTION_REQUIRED',
      requestId: active.requestId,
      sourceFont: unavailableGroups[0].sourceFont,
      availableFonts: [...availableFonts],
    })
    return
  }
  await renderDocument(active, dependencies, stateMachine, getActiveImport)
}

async function resolveFontDecision(
  active: ActiveImport,
  selection: AvailableFont | 'default',
  dependencies: ImportWebDesignDependencies,
  stateMachine: ImportStateMachine,
  getActiveImport: () => ActiveImport | undefined,
): Promise<void> {
  const { fontCatalog } = dependencies
  const group = active.pendingFontGroups?.[0]
  if (fontCatalog === undefined || group === undefined) {
    return
  }
  const loadedFont = await fontCatalog.loadFont(selection === 'default' ? undefined : selection)
  if (!isActive(active, stateMachine, getActiveImport)) {
    return
  }
  active.fontChoices.push({ sourceFont: group.sourceFont, selection: loadedFont })
  active.usedDefaultFont ||= selection === 'default'
  active.pendingFontGroups = active.pendingFontGroups?.slice(1)
  const nextGroup = active.pendingFontGroups?.[0]
  if (nextGroup !== undefined) {
    dependencies.postMessage({
      type: 'FONT_SUBSTITUTION_REQUIRED',
      requestId: active.requestId,
      sourceFont: nextGroup.sourceFont,
      availableFonts: [...(active.availableFonts ?? [])],
    })
    return
  }
  await renderDocument(active, dependencies, stateMachine, getActiveImport)
}

async function renderDocument(
  active: ActiveImport,
  dependencies: ImportWebDesignDependencies,
  stateMachine: ImportStateMachine,
  getActiveImport: () => ActiveImport | undefined,
): Promise<void> {
  const { document } = active
  const { fontCatalog, resourceLoader, renderer } = dependencies
  if (document === undefined || fontCatalog === undefined || resourceLoader === undefined || renderer === undefined) {
    return
  }
  const fontUses = collectFontUses(document.document)
  const defaultFont = await fontCatalog.loadFont()
  if (!isActive(active, stateMachine, getActiveImport)) {
    return
  }
  const plannedFonts = createFontSubstitutionPlan(fontUses, active.fontChoices, defaultFont)
  const resources = await resourceLoader.resolve(collectResources(document.document))
  if (!isActive(active, stateMachine, getActiveImport)) {
    return
  }
  const plannedResources: readonly PlannedNonTypographyResource[] = resources.map((resource) =>
    resource.kind === 'resolved'
      ? resource
      : { id: resource.id, kind: 'placeholder', label: resource.label },
  )
  const temporaryRoot = renderer.createTemporaryRoot(active.startPageId)
  try {
    await renderer.renderCompleteTree(buildRenderPlan(document.document, document.styles, plannedFonts, plannedResources), temporaryRoot)
  } catch {
    renderer.removeTemporaryRoot(temporaryRoot)
    return
  }
  if (!isActive(active, stateMachine, getActiveImport)) {
    renderer.removeTemporaryRoot(temporaryRoot)
    return
  }
  const bounds = dependencies.pageReader.getVisibleContentBounds?.(active.startPageId, temporaryRoot)
  renderer.confirmTemporaryRoot(temporaryRoot, calculateImportDestination(bounds))
  const hasPlaceholders = resources.some((resource) => resource.kind === 'placeholder')
  const status = active.usedDefaultFont || hasPlaceholders ? 'warning' : 'success'
  if (stateMachine.complete(active.requestId, status)) {
    dependencies.postMessage(status === 'success'
      ? { type: 'IMPORT_STATUS', requestId: active.requestId, status }
      : { type: 'IMPORT_STATUS', requestId: active.requestId, status, message: 'Some resources were substituted.' })
  }
}
