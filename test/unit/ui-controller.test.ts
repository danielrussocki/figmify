import { describe, expect, it } from 'vitest'
import { composeUiController } from '../../src/ui/controller'
import type { ApplicationMessage, InterfaceMessage } from '../../src/contracts/messages'

class FakeElement {
  public hidden = false
  public innerHTML = ''
  public textContent = ''
  public value = ''
  public disabled = false
  private readonly listeners = new Map<string, Array<(event: { preventDefault(): void }) => void>>()

  public addEventListener(type: string, listener: (event: { preventDefault(): void }) => void): void {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  public dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ preventDefault: () => undefined })
    }
  }
}

describe('UI controller', () => {
  it('renders a URL form and sends the entered URL in an IMPORT_REQUEST', () => {
    const fixture = createFixture()
    fixture.urlInput.value = ' https://example.com/path?value=1 '

    composeUiController(fixture.options)
    fixture.form.dispatch('submit')

    expect(fixture.root.innerHTML).toContain('Import web design')
    expect(fixture.root.innerHTML).toContain('Website URL')
    expect(fixture.messages).toEqual([
      {
        type: 'IMPORT_REQUEST',
        requestId: 'request-1',
        url: ' https://example.com/path?value=1 ',
      },
    ])
  })

  it('shows append options only after CONFIRM_APPEND and sends the selected decision', () => {
    const fixture = createFixture()
    composeUiController(fixture.options)
    fixture.urlInput.value = 'https://example.com'
    fixture.form.dispatch('submit')

    fixture.receive({ type: 'CONFIRM_APPEND', requestId: 'request-1' })

    expect(fixture.confirmation.hidden).toBe(false)
    fixture.addButton.dispatch('click')
    fixture.cancelButton.dispatch('click')

    expect(fixture.messages).toEqual([
      { type: 'IMPORT_REQUEST', requestId: 'request-1', url: 'https://example.com' },
      { type: 'IMPORT_DECISION', requestId: 'request-1', decision: 'add' },
      { type: 'IMPORT_DECISION', requestId: 'request-1', decision: 'cancel' },
    ])
  })

  it('does not expose an API client or accept a confirmation for a different request', () => {
    const fixture = createFixture()
    composeUiController(fixture.options)
    fixture.urlInput.value = 'https://example.com'
    fixture.form.dispatch('submit')

    fixture.receive({ type: 'CONFIRM_APPEND', requestId: 'another-request' })

    expect(fixture.confirmation.hidden).toBe(true)
    expect(fixture.root.innerHTML).not.toContain('fetch(')
  })

  it('blocks duplicate submissions while processing and lets the user cancel', () => {
    const fixture = createFixture()
    composeUiController(fixture.options)
    fixture.urlInput.value = 'https://example.com'
    fixture.form.dispatch('submit')

    fixture.receive({ type: 'IMPORT_STATUS', requestId: 'request-1', status: 'processing' })
    fixture.form.dispatch('submit')

    expect(fixture.urlInput.disabled).toBe(true)
    expect(fixture.submitButton.disabled).toBe(true)
    expect(fixture.cancelImportButton.hidden).toBe(false)
    expect(fixture.status.textContent).toBe('Importing design...')
    expect(fixture.messages).toEqual([
      { type: 'IMPORT_REQUEST', requestId: 'request-1', url: 'https://example.com' },
    ])

    fixture.cancelImportButton.dispatch('click')

    expect(fixture.messages).toEqual([
      { type: 'IMPORT_REQUEST', requestId: 'request-1', url: 'https://example.com' },
      { type: 'CANCEL_IMPORT', requestId: 'request-1' },
    ])
    expect(fixture.urlInput.disabled).toBe(false)
    expect(fixture.submitButton.disabled).toBe(false)
    expect(fixture.cancelImportButton.hidden).toBe(true)
    expect(fixture.status.textContent).toBe('Import cancelled.')
  })

  it.each([
    [{ type: 'IMPORT_STATUS', requestId: 'request-1', status: 'success' } as const, 'Import completed.'],
    [{ type: 'IMPORT_STATUS', requestId: 'request-1', status: 'warning', message: 'Some resources were replaced.' } as const, 'Some resources were replaced.'],
    [{ type: 'IMPORT_STATUS', requestId: 'request-1', status: 'error', message: 'Unable to reach Figmify API. Please try again.' } as const, 'Unable to reach Figmify API. Please try again.'],
  ])('allows another import after a terminal %s status', (message, expectedStatus) => {
    const fixture = createFixture()
    composeUiController(fixture.options)
    fixture.urlInput.value = 'https://example.com'
    fixture.form.dispatch('submit')
    fixture.receive({ type: 'IMPORT_STATUS', requestId: 'request-1', status: 'processing' })

    fixture.receive(message)

    expect(fixture.urlInput.disabled).toBe(false)
    expect(fixture.submitButton.disabled).toBe(false)
    expect(fixture.cancelImportButton.hidden).toBe(true)
    expect(fixture.status.textContent).toBe(expectedStatus)

    fixture.urlInput.value = 'https://example.com/retry'
    fixture.form.dispatch('submit')

    expect(fixture.messages).toEqual([
      { type: 'IMPORT_REQUEST', requestId: 'request-1', url: 'https://example.com' },
      { type: 'IMPORT_REQUEST', requestId: 'request-1', url: 'https://example.com/retry' },
    ])
  })
})

function createFixture(): {
  options: Parameters<typeof composeUiController>[0]
  root: FakeElement
  form: FakeElement
  urlInput: FakeElement
  confirmation: FakeElement
  addButton: FakeElement
  cancelButton: FakeElement
  cancelImportButton: FakeElement
  progress: FakeElement
  status: FakeElement
  submitButton: FakeElement
  messages: InterfaceMessage[]
  receive(message: ApplicationMessage): void
} {
  const root = new FakeElement()
  const form = new FakeElement()
  const urlInput = new FakeElement()
  const confirmation = new FakeElement()
  const addButton = new FakeElement()
  const cancelButton = new FakeElement()
  const cancelImportButton = new FakeElement()
  const progress = new FakeElement()
  const status = new FakeElement()
  const submitButton = new FakeElement()
  const messages: InterfaceMessage[] = []
  let messageListener: ((event: { data: { pluginMessage?: ApplicationMessage } }) => void) | undefined

  return {
    options: {
      document: {
        getElementById(id: string): FakeElement | null {
          return {
            'figmify-ui': root,
            'import-form': form,
            'url-input': urlInput,
            'append-confirmation': confirmation,
            'append-add': addButton,
            'append-cancel': cancelButton,
            'cancel-import': cancelImportButton,
            'import-progress': progress,
            'import-status': status,
            'import-submit': submitButton,
          }[id] ?? null
        },
      },
      window: {
        parent: {
          postMessage(message: { pluginMessage: InterfaceMessage }): void {
            messages.push(message.pluginMessage)
          },
        },
        addEventListener(_type: 'message', listener: (event: { data: { pluginMessage?: ApplicationMessage } }) => void): void {
          messageListener = listener
        },
      },
      createRequestId: () => 'request-1',
    },
    root,
    form,
    urlInput,
    confirmation,
    addButton,
    cancelButton,
    cancelImportButton,
    progress,
    status,
    submitButton,
    messages,
    receive(message: ApplicationMessage): void {
      messageListener?.({ data: { pluginMessage: message } })
    },
  }
}
