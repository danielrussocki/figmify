import type { ApplicationMessage, AvailableFont, FontReference, InterfaceMessage, RequestId } from '../contracts/messages'

interface UiEvent {
  preventDefault(): void
}

interface UiElement {
  disabled: boolean
  hidden: boolean
  innerHTML: string
  textContent: string
  value: string
  addEventListener(type: string, listener: (event: UiEvent) => void): void
}

interface UiDocument {
  getElementById(id: string): UiElement | null
}

interface UiWindow {
  parent: {
    postMessage(message: { pluginMessage: InterfaceMessage }, targetOrigin: string): void
  }
  addEventListener(
    type: 'message',
    listener: (event: { data: { pluginMessage?: ApplicationMessage } }) => void,
  ): void
}

interface PendingFontSubstitution {
  sourceFont: FontReference
  availableFonts: AvailableFont[]
}

export interface UiControllerOptions {
  document: UiDocument
  window: UiWindow
  createRequestId: () => RequestId
}

declare const document: UiDocument
declare const window: UiWindow

export function composeUiController(options: UiControllerOptions = createBrowserOptions()): void {
  const root = requiredElement(options.document, 'figmify-ui')
  root.innerHTML = `
    <section aria-labelledby="figmify-title">
      <h1 id="figmify-title">Import web design</h1>
      <form id="import-form">
        <label for="url-input">Website URL</label>
        <input id="url-input" name="url" type="text" required>
        <button id="import-submit" type="submit">Import</button>
      </form>
      <section id="import-progress" hidden aria-live="polite">
        <p id="import-status"></p>
        <button id="cancel-import" type="button">Cancel import</button>
      </section>
      <section id="append-confirmation" hidden aria-live="polite">
        <p>This page already contains content. Add the imported design?</p>
        <button id="append-add" type="button">Add</button>
        <button id="append-cancel" type="button">Cancel</button>
      </section>
      <section id="font-substitution" hidden aria-live="polite">
        <p id="font-source"></p>
        <label for="font-selection">Available font</label>
        <select id="font-selection"></select>
        <button id="font-confirm" type="button">Use selected font</button>
        <button id="font-cancel" type="button">Use default font</button>
      </section>
    </section>
  `

  const form = requiredElement(options.document, 'import-form')
  const urlInput = requiredElement(options.document, 'url-input')
  const submitButton = requiredElement(options.document, 'import-submit')
  const confirmation = requiredElement(options.document, 'append-confirmation')
  const addButton = requiredElement(options.document, 'append-add')
  const cancelButton = requiredElement(options.document, 'append-cancel')
  const progress = requiredElement(options.document, 'import-progress')
  const status = requiredElement(options.document, 'import-status')
  const cancelImportButton = requiredElement(options.document, 'cancel-import')
  const fontSubstitution = requiredElement(options.document, 'font-substitution')
  const fontSource = requiredElement(options.document, 'font-source')
  const fontSelection = requiredElement(options.document, 'font-selection')
  const fontConfirmButton = requiredElement(options.document, 'font-confirm')
  const fontCancelButton = requiredElement(options.document, 'font-cancel')
  confirmation.hidden = true
  progress.hidden = false
  cancelImportButton.hidden = true
  fontSubstitution.hidden = true

  let activeRequestId: RequestId | undefined
  let isProcessing = false
  let pendingFontSubstitution: PendingFontSubstitution | undefined

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (isProcessing) {
      return
    }

    const requestId = options.createRequestId()
    activeRequestId = requestId
    confirmation.hidden = true
    fontSubstitution.hidden = true
    pendingFontSubstitution = undefined
    status.textContent = ''
    postMessage(options.window, { type: 'IMPORT_REQUEST', requestId, url: urlInput.value })
  })

  addButton.addEventListener('click', (event) => {
    event.preventDefault()
    sendAppendDecision(options.window, activeRequestId, 'add')
  })

  cancelButton.addEventListener('click', (event) => {
    event.preventDefault()
    sendAppendDecision(options.window, activeRequestId, 'cancel')
    confirmation.hidden = true
  })

  cancelImportButton.addEventListener('click', (event) => {
    event.preventDefault()
    if (!isProcessing || activeRequestId === undefined) {
      return
    }

    postMessage(options.window, { type: 'CANCEL_IMPORT', requestId: activeRequestId })
    activeRequestId = undefined
    isProcessing = false
    pendingFontSubstitution = undefined
    fontSubstitution.hidden = true
    setProcessingState(false, urlInput, submitButton, progress, cancelImportButton)
    status.textContent = 'Import cancelled.'
  })

  fontConfirmButton.addEventListener('click', (event) => {
    event.preventDefault()
    const selection = selectedFont(fontSelection.value, pendingFontSubstitution)
    if (activeRequestId === undefined || pendingFontSubstitution === undefined || selection === undefined) {
      return
    }

    postMessage(options.window, {
      type: 'FONT_SUBSTITUTION_DECISION',
      requestId: activeRequestId,
      sourceFont: pendingFontSubstitution.sourceFont,
      selection,
    })
    pendingFontSubstitution = undefined
    fontSubstitution.hidden = true
  })

  fontCancelButton.addEventListener('click', (event) => {
    event.preventDefault()
    if (activeRequestId === undefined || pendingFontSubstitution === undefined) {
      return
    }

    postMessage(options.window, {
      type: 'FONT_SUBSTITUTION_DECISION',
      requestId: activeRequestId,
      sourceFont: pendingFontSubstitution.sourceFont,
      selection: 'default',
    })
    pendingFontSubstitution = undefined
    fontSubstitution.hidden = true
  })

  options.window.addEventListener('message', (event) => {
    const message = event.data.pluginMessage
    if (message?.type === 'CONFIRM_APPEND' && message.requestId === activeRequestId) {
      confirmation.hidden = false
      return
    }

    if (message?.type === 'FONT_SUBSTITUTION_REQUIRED' && message.requestId === activeRequestId) {
      pendingFontSubstitution = {
        sourceFont: message.sourceFont,
        availableFonts: message.availableFonts,
      }
      fontSource.textContent = `Select a replacement font for ${message.sourceFont.family} ${message.sourceFont.style}.`
      fontSelection.innerHTML = message.availableFonts
        .map((font, index) => `<option value="${index}">${escapeHtml(font.family)} ${escapeHtml(font.style)}</option>`)
        .join('')
      fontSelection.value = '0'
      fontSubstitution.hidden = false
      return
    }

    if (message?.type === 'IMPORT_STATUS' && message.requestId === activeRequestId) {
      if (message.status === 'processing') {
        isProcessing = true
        setProcessingState(true, urlInput, submitButton, progress, cancelImportButton)
        status.textContent = 'Importing design...'
        return
      }

      isProcessing = false
      pendingFontSubstitution = undefined
      fontSubstitution.hidden = true
      setProcessingState(false, urlInput, submitButton, progress, cancelImportButton)
      status.textContent = message.status === 'success' ? 'Import completed.' : message.message
    }
  })
}

function selectedFont(value: string, pending: PendingFontSubstitution | undefined): AvailableFont | undefined {
  if (pending === undefined) {
    return undefined
  }

  const index = Number(value)
  return Number.isInteger(index) ? pending.availableFonts[index] : undefined
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function createBrowserOptions(): UiControllerOptions {
  let nextRequestNumber = 0

  return {
    document,
    window,
    createRequestId: () => {
      nextRequestNumber += 1
      return `import-${nextRequestNumber}`
    },
  }
}

function requiredElement(uiDocument: UiDocument, id: string): UiElement {
  const element = uiDocument.getElementById(id)
  if (element === null) {
    throw new Error(`Required UI element not found: ${id}`)
  }
  return element
}

function postMessage(uiWindow: UiWindow, message: InterfaceMessage): void {
  uiWindow.parent.postMessage({ pluginMessage: message }, '*')
}

function setProcessingState(
  isProcessing: boolean,
  urlInput: UiElement,
  submitButton: UiElement,
  progress: UiElement,
  cancelImportButton: UiElement,
): void {
  urlInput.disabled = isProcessing
  submitButton.disabled = isProcessing
  progress.hidden = false
  cancelImportButton.hidden = !isProcessing
}

function sendAppendDecision(
  uiWindow: UiWindow,
  requestId: RequestId | undefined,
  decision: 'add' | 'cancel',
): void {
  if (requestId !== undefined) {
    postMessage(uiWindow, { type: 'IMPORT_DECISION', requestId, decision })
  }
}
