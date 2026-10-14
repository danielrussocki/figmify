import type { FigmaNode, FigmaNodeType, FigmaRect } from '../contracts/api-v1'

export interface RenderPlanGeometry {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface RenderPlanNode {
  readonly id: string
  readonly type: FigmaNodeType
  readonly geometry: RenderPlanGeometry
  readonly isVisible: boolean
  readonly opacity: number
  readonly children: readonly RenderPlanNode[]
}

function geometryFrom(rect: FigmaRect): RenderPlanGeometry {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  }
}

export function buildRenderPlan(node: FigmaNode): RenderPlanNode {
  return {
    id: node.id,
    type: node.type,
    geometry: geometryFrom(node.relativeRect ?? node.rect),
    isVisible: node.isVisible,
    opacity: node.opacity ?? 1,
    children: node.children.map(buildRenderPlan),
  }
}
