export type FigmaSchemaVersion = '1.0'

export interface FigmaRect {
  x: number
  y: number
  width: number
  height: number
  top: number
  left: number
}

export type FigmaRelativeRect = FigmaRect

export type FigmaNodeType = 'FRAME' | 'TEXT' | 'IMAGE'
export type FigmaLayoutMode = 'HORIZONTAL' | 'VERTICAL'
export type FigmaPrimaryAxisAlign = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
export type FigmaCounterAxisAlign = 'MIN' | 'CENTER' | 'MAX'
export type FigmaPosition = 'absolute' | 'sticky'
export type FigmaTextAlign = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
export type FigmaTextAutoResize = 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE'
export type FigmaStrokeSide = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT'
export type ColorStyleId = `color-${string}`
export type TypographyStyleId = `type-${string}`

export interface FigmaViewport {
  width: number
  height: number
  deviceScaleFactor: 1 | 2 | 3
}

export interface FigmaRgbaColor {
  r: number
  g: number
  b: number
  a: number
}

export interface FigmaPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface FigmaSolidPaint {
  type: 'SOLID'
  color: FigmaRgbaColor
}

export interface FigmaImagePaint {
  type: 'IMAGE'
  src: string
  scaleMode: 'FILL'
}

export type FigmaPaint = FigmaSolidPaint | FigmaImagePaint
export type FigmaFills = FigmaPaint[]

export interface FigmaStroke extends FigmaSolidPaint {
  side?: FigmaStrokeSide
  weight: number
}

export type FigmaStrokes = FigmaStroke[] | null

export interface FigmaStrokeWeights {
  top: number
  right: number
  bottom: number
  left: number
}

export interface FigmaEffectOffset {
  x: number
  y: number
}

export interface FigmaDropShadowEffect {
  type: 'DROP_SHADOW'
  color: FigmaRgbaColor
  offset: FigmaEffectOffset
  radius: number
  spread: number
}

export interface FigmaInnerShadowEffect {
  type: 'INNER_SHADOW'
  color: FigmaRgbaColor
  offset: FigmaEffectOffset
  radius: number
  spread: number
}

export type FigmaEffect = FigmaDropShadowEffect | FigmaInnerShadowEffect

export interface FigmaCornerRadii {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

export interface ColorStyle {
  id: ColorStyleId
  name: string
  rgba: FigmaRgbaColor
}

export interface TypographyStyle {
  id: TypographyStyleId
  fontFamily: string
  fontSize: string
  fontWeight: string
  fontStyle: string
  lineHeight: string
  letterSpacing: string
  textTransform: string
}

export interface FigmaStyleCatalog {
  colors: ColorStyle[]
  typographies: TypographyStyle[]
}

export interface FigmaTextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  letterSpacing: number
  textAlign: FigmaTextAlign
  textAutoResize: FigmaTextAutoResize
}

export interface FigmaElementImageData {
  src: string
  naturalWidth: number
  naturalHeight: number
  objectFit: string
}

export interface FigmaBackgroundImageData {
  src: string
  backgroundSize: string
}

export type FigmaImageData = FigmaElementImageData | FigmaBackgroundImageData

export interface FigmaFontAsset {
  family: string
  weights: number[]
  url?: string
}

export interface FigmaNode {
  id: string
  tag: string
  type: FigmaNodeType
  rect: FigmaRect
  relativeRect?: FigmaRelativeRect
  isVisible: boolean
  opacity?: number
  layoutMode?: FigmaLayoutMode
  itemSpacing?: number
  gap?: number
  padding?: FigmaPadding
  primaryAxisAlign?: FigmaPrimaryAxisAlign
  counterAxisAlign?: FigmaCounterAxisAlign
  layoutGrow?: number
  position?: FigmaPosition
  zIndex?: number
  fills?: FigmaFills
  strokes?: FigmaStrokes
  strokeWeight?: number
  strokeWeights?: FigmaStrokeWeights
  effects?: FigmaEffect[] | null
  cornerRadius?: number
  cornerRadii?: FigmaCornerRadii
  characters?: string
  styles?: FigmaTextStyle
  image?: FigmaImageData
  svg?: string
  children: FigmaNode[]
}

export interface FigmaSource {
  url: string
  viewport: FigmaViewport
}

export interface FigmaDocument {
  schemaVersion: FigmaSchemaVersion
  source: FigmaSource
  styles: FigmaStyleCatalog
  assets: FigmaFontAsset[]
  document: FigmaNode
}

export interface ApiError {
  code: string
  message: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFigmaNodeType(value: unknown): value is FigmaNodeType {
  return value === 'FRAME' || value === 'TEXT' || value === 'IMAGE'
}

export function hasValidFigmaRect(value: unknown): value is FigmaRect {
  if (!isRecord(value)) {
    return false
  }

  return (
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    isFiniteNumber(value.top) &&
    isFiniteNumber(value.left)
  )
}

export function hasValidApiV1Node(value: unknown): value is FigmaNode {
  if (!isRecord(value)) {
    return false
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.tag !== 'string' ||
    !isFigmaNodeType(value.type) ||
    !hasValidFigmaRect(value.rect) ||
    (value.relativeRect !== undefined && !hasValidFigmaRect(value.relativeRect)) ||
    typeof value.isVisible !== 'boolean' ||
    !Array.isArray(value.children)
  ) {
    return false
  }

  return value.children.every(hasValidApiV1Node)
}

export function hasValidApiV1Header(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.schemaVersion === '1.0' &&
    isRecord(value.source) &&
    isRecord(value.document)
  )
}
