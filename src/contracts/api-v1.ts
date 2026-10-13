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

function isRgbaColor(value: unknown): value is FigmaRgbaColor {
  return (
    isRecord(value) &&
    isFiniteNumber(value.r) &&
    isFiniteNumber(value.g) &&
    isFiniteNumber(value.b) &&
    isFiniteNumber(value.a)
  )
}

function isSolidPaint(value: unknown): value is FigmaSolidPaint {
  return isRecord(value) && value.type === 'SOLID' && isRgbaColor(value.color)
}

function isPaint(value: unknown): value is FigmaPaint {
  return (
    isSolidPaint(value) ||
    (isRecord(value) && value.type === 'IMAGE' && typeof value.src === 'string' && value.scaleMode === 'FILL')
  )
}

function isStroke(value: unknown): value is FigmaStroke {
  return (
    isSolidPaint(value) &&
    isFiniteNumber(value.weight) &&
    (value.side === undefined || value.side === 'TOP' || value.side === 'RIGHT' || value.side === 'BOTTOM' || value.side === 'LEFT')
  )
}

function isEffect(value: unknown): value is FigmaEffect {
  return (
    isRecord(value) &&
    (value.type === 'DROP_SHADOW' || value.type === 'INNER_SHADOW') &&
    isRgbaColor(value.color) &&
    isRecord(value.offset) &&
    isFiniteNumber(value.offset.x) &&
    isFiniteNumber(value.offset.y) &&
    isFiniteNumber(value.radius) &&
    isFiniteNumber(value.spread)
  )
}

function isTextStyle(value: unknown): value is FigmaTextStyle {
  return (
    isRecord(value) &&
    typeof value.fontFamily === 'string' &&
    isFiniteNumber(value.fontSize) &&
    isFiniteNumber(value.fontWeight) &&
    isFiniteNumber(value.lineHeight) &&
    isFiniteNumber(value.letterSpacing) &&
    (value.textAlign === 'LEFT' || value.textAlign === 'CENTER' || value.textAlign === 'RIGHT' || value.textAlign === 'JUSTIFIED') &&
    (value.textAutoResize === 'NONE' || value.textAutoResize === 'WIDTH_AND_HEIGHT' || value.textAutoResize === 'HEIGHT' || value.textAutoResize === 'TRUNCATE')
  )
}

function isImageData(value: unknown): value is FigmaImageData {
  if (!isRecord(value) || typeof value.src !== 'string') {
    return false
  }

  return (
    (isFiniteNumber(value.naturalWidth) && isFiniteNumber(value.naturalHeight) && typeof value.objectFit === 'string') ||
    typeof value.backgroundSize === 'string'
  )
}

function isStyleCatalog(value: unknown): value is FigmaStyleCatalog {
  if (!isRecord(value) || !Array.isArray(value.colors) || !Array.isArray(value.typographies)) {
    return false
  }

  return (
    value.colors.every((color) => isRecord(color) && typeof color.id === 'string' && color.id.startsWith('color-') && typeof color.name === 'string' && isRgbaColor(color.rgba)) &&
    value.typographies.every((typography) =>
      isRecord(typography) &&
      typeof typography.id === 'string' &&
      typography.id.startsWith('type-') &&
      typeof typography.fontFamily === 'string' &&
      typeof typography.fontSize === 'string' &&
      typeof typography.fontWeight === 'string' &&
      typeof typography.fontStyle === 'string' &&
      typeof typography.lineHeight === 'string' &&
      typeof typography.letterSpacing === 'string' &&
      typeof typography.textTransform === 'string',
    )
  )
}

function isFontAsset(value: unknown): value is FigmaFontAsset {
  return (
    isRecord(value) &&
    typeof value.family === 'string' &&
    Array.isArray(value.weights) &&
    value.weights.every(isFiniteNumber) &&
    (value.url === undefined || typeof value.url === 'string')
  )
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

  if (
    (value.fills !== undefined && (!Array.isArray(value.fills) || !value.fills.every(isPaint))) ||
    (value.strokes !== undefined && value.strokes !== null && (!Array.isArray(value.strokes) || !value.strokes.every(isStroke))) ||
    (value.effects !== undefined && value.effects !== null && (!Array.isArray(value.effects) || !value.effects.every(isEffect))) ||
    (value.styles !== undefined && !isTextStyle(value.styles)) ||
    (value.image !== undefined && !isImageData(value.image)) ||
    (value.svg !== undefined && typeof value.svg !== 'string')
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

export function hasValidApiV1Document(value: unknown): value is FigmaDocument {
  if (!hasValidApiV1Header(value) || !isRecord(value) || !isRecord(value.source)) {
    return false
  }

  return (
    typeof value.source.url === 'string' &&
    isRecord(value.source.viewport) &&
    isFiniteNumber(value.source.viewport.width) &&
    isFiniteNumber(value.source.viewport.height) &&
    (value.source.viewport.deviceScaleFactor === 1 || value.source.viewport.deviceScaleFactor === 2 || value.source.viewport.deviceScaleFactor === 3) &&
    isStyleCatalog(value.styles) &&
    Array.isArray(value.assets) &&
    value.assets.every(isFontAsset) &&
    hasValidApiV1Node(value.document)
  )
}
