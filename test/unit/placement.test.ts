import { describe, expect, it } from 'vitest'
import type { AppendDecision } from '../../src/domain/import-session'
import {
  calculateImportDestination,
  getVisibleContentBounds,
  requiresAppendConfirmation,
  shouldContinueAfterAppendDecision,
} from '../../src/domain/placement'

describe('import placement policy', () => {
  it('does not require append confirmation for an empty start page', () => {
    expect(requiresAppendConfirmation(false)).toBe(false)
  })

  it('requires append confirmation when the start page already has content', () => {
    expect(requiresAppendConfirmation(true)).toBe(true)
  })

  it('continues an import only when the user chooses to add', () => {
    const add: AppendDecision = 'add'
    const cancel: AppendDecision = 'cancel'

    expect(shouldContinueAfterAppendDecision(add)).toBe(true)
    expect(shouldContinueAfterAppendDecision(cancel)).toBe(false)
  })
})

describe('import placement', () => {
  it('places the first import at the canvas origin when the page has no visible content', () => {
    const bounds = getVisibleContentBounds([])

    expect(calculateImportDestination(bounds)).toEqual({ x: 0, y: 0 })
  })

  it('uses content added while the import was pending when calculating the destination', () => {
    const initialBounds = getVisibleContentBounds([])
    const boundsAtCompletion = getVisibleContentBounds([
      { id: 'added-during-import', x: 40, y: 24, width: 260, height: 80 },
    ])

    expect(calculateImportDestination(initialBounds)).toEqual({ x: 0, y: 0 })
    expect(calculateImportDestination(boundsAtCompletion)).toEqual({ x: 400, y: 24 })
  })

  it('places an appended design 100 pixels right of visible content and aligned with its top edge', () => {
    const bounds = getVisibleContentBounds([
      { id: 'header', x: 80, y: 120, width: 640, height: 72 },
      { id: 'hero', x: 40, y: 48, width: 960, height: 540 },
    ])

    expect(calculateImportDestination(bounds)).toEqual({ x: 1100, y: 48 })
  })

  it('excludes the temporary import root from the visible content bounds', () => {
    const bounds = getVisibleContentBounds(
      [
        { id: 'existing-content', x: 20, y: 32, width: 200, height: 100 },
        { id: 'staging-root', x: -10000, y: -10000, width: 800, height: 600 },
      ],
      'staging-root',
    )

    expect(calculateImportDestination(bounds)).toEqual({ x: 320, y: 32 })
  })
})
