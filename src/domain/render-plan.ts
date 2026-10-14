import type {
  ColorStyleId,
  FigmaStyleCatalog,
  FigmaCornerRadii,
  FigmaEffect,
  FigmaNode,
  FigmaNodeType,
  FigmaPadding,
  FigmaPaint,
  FigmaPosition,
  FigmaCounterAxisAlign,
  FigmaLayoutMode,
  FigmaPrimaryAxisAlign,
  FigmaRect,
  FigmaRgbaColor,
  FigmaSolidPaint,
  FigmaStroke,
  FigmaStrokeWeights,
} from '../contracts/api-v1'
import type { AvailableFont } from '../contracts/messages'
import type { PlannedFontUse } from './font-substitution'

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

export interface RenderPlanAutoLayout {
  readonly layoutMode?: FigmaLayoutMode
  readonly itemSpacing?: number
  readonly gap?: number
  readonly padding?: FigmaPadding
  readonly primaryAxisAlign?: FigmaPrimaryAxisAlign
  readonly counterAxisAlign?: FigmaCounterAxisAlign
  readonly layoutGrow?: number
  readonly position?: FigmaPosition
}

export interface RenderPlanText {
  readonly characters?: string
  readonly font?: AvailableFont
  readonly fontFamily?: string
  readonly fontSize?: number
  readonly fontWeight?: number
  readonly lineHeight?: number
  readonly letterSpacing?: number
  readonly textAlign?: FigmaNode['styles']['textAlign']
  readonly textAutoResize?: FigmaNode['styles']['textAutoResize']
}

export interface RenderPlanNode extends RenderPlanAutoLayout {
  readonly id: string
  readonly type: FigmaNodeType
  readonly geometry: RenderPlanGeometry
  readonly isVisible: boolean
  readonly opacity: number
  readonly fills?: readonly RenderPlanSolidPaint[]
  readonly fillColorStyleIds?: readonly (ColorStyleId | undefined)[]
  readonly strokes?: readonly RenderPlanStroke[] | null
  readonly strokeColorStyleIds?: readonly (ColorStyleId | undefined)[] | null
  readonly strokeWeight?: number
  readonly strokeWeights?: FigmaStrokeWeights
  readonly cornerRadius?: number
  readonly cornerRadii?: FigmaCornerRadii
  readonly effects?: readonly RenderPlanEffect[] | null
  readonly text?: RenderPlanText
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

function paddingFrom(padding: FigmaPadding): FigmaPadding {
  return { ...padding }
}

function colorStyleIdFor(color: FigmaRgbaColor, styles: FigmaStyleCatalog): ColorStyleId | undefined {
  return styles.colors.find((style) =>
    style.rgba.r === color.r &&
    style.rgba.g === color.g &&
    style.rgba.b === color.b &&
    style.rgba.a === color.a,
  )?.id
}

function solidPaintsFrom(fills: readonly FigmaPaint[]): readonly FigmaSolidPaint[] {
  return fills.filter(isSolidPaint)
}

function textFrom(node: FigmaNode, fontSubstitutions: ReadonlyMap<string, AvailableFont>): RenderPlanText | undefined {
  if (node.type !== 'TEXT') {
    return undefined
  }

  const font = fontSubstitutions.get(node.id)

  if (node.characters === undefined && node.styles === undefined && font === undefined) {
    return undefined
  }

  return {
    ...(node.characters === undefined ? {} : { characters: node.characters }),
    ...(font === undefined ? {} : { font: { ...font } }),
    ...(node.styles === undefined
      ? {}
      : {
          fontFamily: node.styles.fontFamily,
          fontSize: node.styles.fontSize,
          fontWeight: node.styles.fontWeight,
          lineHeight: node.styles.lineHeight,
          letterSpacing: node.styles.letterSpacing,
          textAlign: node.styles.textAlign,
          textAutoResize: node.styles.textAutoResize,
        }),
  }
}

function buildRenderPlanNode(
  node: FigmaNode,
  styles: FigmaStyleCatalog | undefined,
  fontSubstitutions: ReadonlyMap<string, AvailableFont>,
): RenderPlanNode {
  const solidFills = node.fills === undefined ? undefined : solidPaintsFrom(node.fills)
  const text = textFrom(node, fontSubstitutions)

  return {
    id: node.id,
    type: node.type,
    geometry: geometryFrom(node.relativeRect ?? node.rect),
    isVisible: node.isVisible,
    opacity: node.opacity ?? 1,
    ...(solidFills === undefined ? {} : { fills: solidFills.map(solidPaintFrom) }),
    ...(solidFills === undefined || styles === undefined
      ? {}
      : { fillColorStyleIds: solidFills.map((fill) => colorStyleIdFor(fill.color, styles)) }),
    ...(node.strokes === undefined
      ? {}
      : { strokes: node.strokes === null ? null : node.strokes.map(strokeFrom) }),
    ...(node.strokes === undefined || styles === undefined
      ? {}
      : {
          strokeColorStyleIds: node.strokes === null
            ? null
            : node.strokes.map((stroke) => colorStyleIdFor(stroke.color, styles)),
        }),
    ...(node.strokeWeight === undefined ? {} : { strokeWeight: node.strokeWeight }),
    ...(node.strokeWeights === undefined ? {} : { strokeWeights: strokeWeightsFrom(node.strokeWeights) }),
    ...(node.cornerRadius === undefined ? {} : { cornerRadius: node.cornerRadius }),
    ...(node.cornerRadii === undefined ? {} : { cornerRadii: cornerRadiiFrom(node.cornerRadii) }),
    ...(node.effects === undefined ? {} : { effects: node.effects === null ? null : node.effects.map(effectFrom) }),
    ...(text === undefined ? {} : { text }),
    ...(node.layoutMode === undefined ? {} : { layoutMode: node.layoutMode }),
    ...(node.itemSpacing === undefined ? {} : { itemSpacing: node.itemSpacing }),
    ...(node.gap === undefined ? {} : { gap: node.gap }),
    ...(node.padding === undefined ? {} : { padding: paddingFrom(node.padding) }),
    ...(node.primaryAxisAlign === undefined ? {} : { primaryAxisAlign: node.primaryAxisAlign }),
    ...(node.counterAxisAlign === undefined ? {} : { counterAxisAlign: node.counterAxisAlign }),
    ...(node.layoutGrow === undefined ? {} : { layoutGrow: node.layoutGrow }),
    ...(node.position === undefined ? {} : { position: node.position }),
    children: node.children.map((child) => buildRenderPlanNode(child, styles, fontSubstitutions)),
  }
}

export function buildRenderPlan(
  node: FigmaNode,
  styles?: FigmaStyleCatalog,
  plannedFontUses: readonly PlannedFontUse[] = [],
): RenderPlanNode {
  const fontSubstitutions = new Map(plannedFontUses.map((plannedFontUse) => [plannedFontUse.id, plannedFontUse.font]))

  return buildRenderPlanNode(node, styles, fontSubstitutions)
}
