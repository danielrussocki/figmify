import { describe, expect, it } from 'vitest'
import { createImportStateMachine } from '../../src/domain/import-session'

const requestId = 'request-123'

describe('import state machine', () => {
  it('starts idle', () => {
    const machine = createImportStateMachine()

    expect(machine.state).toBe('idle')
  })

  it('waits for append confirmation when the start page has content', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, true)

    expect(machine.state).toBe('confirming')
  })

  it('moves from confirmation to processing when append is accepted', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, true)
    machine.resolveAppendDecision(requestId, 'add')

    expect(machine.state).toBe('processing')
  })

  it('moves directly to processing when append confirmation is not needed', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, false)

    expect(machine.state).toBe('processing')
  })

  it('finishes with success after processing', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, false)
    machine.complete(requestId, 'success')

    expect(machine.state).toBe('success')
  })

  it('finishes with a warning after processing', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, false)
    machine.complete(requestId, 'warning')

    expect(machine.state).toBe('warning')
  })

  it('finishes with an error after processing', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, false)
    machine.complete(requestId, 'error')

    expect(machine.state).toBe('error')
  })

  it('cancels while awaiting confirmation', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, true)
    machine.cancel(requestId)

    expect(machine.state).toBe('cancelled')
  })

  it('cancels while processing', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, false)
    machine.cancel(requestId)

    expect(machine.state).toBe('cancelled')
  })

  it('rejects a second request while processing', () => {
    const machine = createImportStateMachine()

    expect(machine.requestImport(requestId, false)).toBe(true)
    expect(machine.requestImport('request-456', false)).toBe(false)

    expect(machine.state).toBe('processing')
  })

  it('discards a late result from an inactive session', () => {
    const machine = createImportStateMachine()

    machine.requestImport(requestId, false)
    machine.cancel(requestId)

    expect(machine.complete(requestId, 'success')).toBe(false)
    expect(machine.state).toBe('cancelled')
  })
})
