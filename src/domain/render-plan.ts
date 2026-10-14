import type {
  FigmaCornerRadii,
  FigmaEffect,
  FigmaNode,
  FigmaNodeType,
  FigmaPaint,
  FigmaRect,
  FigmaRgbaColor,
  FigmaSolidPaint,
  FigmaStroke,
  FigmaStrokeWeights,
} from '../contracts/api-v1'

export interface RenderPlanGeometry {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface RenderPlanSolidPaint {
  readonly type: 'SOLID'
  readonly color: FigmaRgbaColor
}

export interface RenderPlanStroke extends RenderPlanSolidPaint {
  readonly side?: FigmaStroke['side']
  readonly weight: number
}

export interface RenderPlanEffect {
  readonly type: FigmaEffect['type']
  readonly color: FigmaRgbaColor
  readonly offset: {
    readonly x: number
    readonly y: number
  }
  readonly radius: number
  readonly spread: number
}

export interface RenderPlanNode {
  readonly id: string
  readonly type: FigmaNodeType
  readonly geometry: RenderPlanGeometry
  readonly isVisible: boolean
  readonly opacity: number
  readonly fills?: readonly RenderPlanSolidPaint[]
  readonly strokes?: readonly RenderPlanStroke[] | null
  readonly strokeWeight?: number
  readonly strokeWeights?: FigmaStrokeWeights
  readonly cornerRadius?: number
  readonly cornerRadii?: FigmaCornerRadii
  readonly effects?: readonly RenderPlanEffect[] | null
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

function copyColor(color: FigmaRgbaColor): FigmaRgbaColor {
  return { ...color }
}

function solidPaintFrom(paint: FigmaSolidPaint): RenderPlanSolidPaint {
  return { type: 'SOLID', color: copyColor(paint.color) }
}

function strokeFrom(stroke: FigmaStroke): RenderPlanStroke {
  return {
    ...solidPaintFrom(stroke),
    ...(stroke.side === undefined ? {} : { side: stroke.side }),
    weight: stroke.weight,
  }
}

function isSolidPaint(paint: FigmaPaint): paint is FigmaSolidPaint {
  return paint.type === 'SOLID'
}

function strokeWeightsFrom(weights: FigmaStrokeWeights): FigmaStrokeWeights {
  return { ...weights }
}

function cornerRadiiFrom(radii: FigmaCornerRadii): FigmaCornerRadii {
  return { ...radii }
}

function effectFrom(effect: FigmaEffect): RenderPlanEffect {
  return {
    type: effect.type,
    color: copyColor(effect.color),
    offset: { ...effect.offset },
    radius: effect.radius,
    spread: effect.spread,
  }
}

export function buildRenderPlan(node: FigmaNode): RenderPlanNode {
  return {
    id: node.id,
    type: node.type,
    geometry: geometryFrom(node.relativeRect ?? node.rect),
    isVisible: node.isVisible,
    opacity: node.opacity ?? 1,
    ...(node.fills === undefined ? {} : { fills: node.fills.filter(isSolidPaint).map(solidPaintFrom) }),
    ...(node.strokes === undefined
      ? {}
      : { strokes: node.strokes === null ? null : node.strokes.map(strokeFrom) }),
    ...(node.strokeWeight === undefined ? {} : { strokeWeight: node.strokeWeight }),
    ...(node.strokeWeights === undefined ? {} : { strokeWeights: strokeWeightsFrom(node.strokeWeights) }),
    ...(node.cornerRadius === undefined ? {} : { cornerRadius: node.cornerRadius }),
    ...(node.cornerRadii === undefined ? {} : { cornerRadii: cornerRadiiFrom(node.cornerRadii) }),
    ...(node.effects === undefined ? {} : { effects: node.effects === null ? null : node.effects.map(effectFrom) }),
    children: node.children.map(buildRenderPlan),
  }
}
