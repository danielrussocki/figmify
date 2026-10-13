import { describe, expect, it } from 'vitest'
import type {
  ApplicationMessage,
  AvailableFont,
  FontReference,
  InterfaceMessage,
} from '../../src/contracts/messages'

const requestId = 'request-123'
const sourceFont: FontReference = { family: 'Missing Font', style: 'Regular' }
const replacementFont: AvailableFont = { family: 'Inter', style: 'Regular' }

describe('interface protocol messages', () => {
  it('represents every message sent by the interface with a request ID', () => {
    const messages: InterfaceMessage[] = [
      { type: 'IMPORT_REQUEST', requestId, url: 'https://example.com' },
      { type: 'IMPORT_DECISION', requestId, decision: 'add' },
      { type: 'FONT_SUBSTITUTION_DECISION', requestId, sourceFont, selection: replacementFont },
      { type: 'FONT_SUBSTITUTION_DECISION', requestId, sourceFont, selection: 'default' },
      { type: 'CANCEL_IMPORT', requestId },
      { type: 'CLOSE_PLUGIN', requestId },
    ]

    expect(messages.map((message) => message.requestId)).toEqual(Array(messages.length).fill(requestId))
  })

  it('represents every message sent by the application with a request ID', () => {
    const messages: ApplicationMessage[] = [
      { type: 'CONFIRM_APPEND', requestId },
      {
        type: 'FONT_SUBSTITUTION_REQUIRED',
        requestId,
        sourceFont,
        availableFonts: [replacementFont],
      },
      { type: 'IMPORT_STATUS', requestId, status: 'processing' },
      { type: 'IMPORT_STATUS', requestId, status: 'success' },
      { type: 'IMPORT_STATUS', requestId, status: 'warning', message: 'Some resources were replaced.' },
      { type: 'IMPORT_STATUS', requestId, status: 'error', message: 'Unable to reach Figmify API. Please try again.' },
    ]

    expect(messages.map((message) => message.requestId)).toEqual(Array(messages.length).fill(requestId))
  })

  it('narrows messages by their discriminant', () => {
    const message: InterfaceMessage = {
      type: 'FONT_SUBSTITUTION_DECISION',
      requestId,
      sourceFont,
      selection: 'default',
    }

    if (message.type === 'FONT_SUBSTITUTION_DECISION') {
      expect(message.selection).toBe('default')
      expect(message.sourceFont).toEqual(sourceFont)
    }
  })
})
