import type { AppendDecision } from './import-session'

export interface VisibleContentNode {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface VisibleContentBounds {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

export interface ImportDestination {
  readonly x: number
  readonly y: number
}

const importGap = 100

export function requiresAppendConfirmation(startPageHasNodes: boolean): boolean {
  return startPageHasNodes
}

export function shouldContinueAfterAppendDecision(decision: AppendDecision): boolean {
  return decision === 'add'
}

export function getVisibleContentBounds(
  nodes: readonly VisibleContentNode[],
  temporaryRootId?: string,
): VisibleContentBounds | undefined {
  const visibleNodes = nodes.filter((node) => node.id !== temporaryRootId)

  if (visibleNodes.length === 0) {
    return undefined
  }

  return visibleNodes.reduce<VisibleContentBounds>((bounds, node) => ({
    left: Math.min(bounds.left, node.x),
    top: Math.min(bounds.top, node.y),
    right: Math.max(bounds.right, node.x + node.width),
    bottom: Math.max(bounds.bottom, node.y + node.height),
  }), {
    left: visibleNodes[0].x,
    top: visibleNodes[0].y,
    right: visibleNodes[0].x + visibleNodes[0].width,
    bottom: visibleNodes[0].y + visibleNodes[0].height,
  })
}

export function calculateImportDestination(bounds: VisibleContentBounds | undefined): ImportDestination {
  if (bounds === undefined) {
    return { x: 0, y: 0 }
  }

  return { x: bounds.right + importGap, y: bounds.top }
}
