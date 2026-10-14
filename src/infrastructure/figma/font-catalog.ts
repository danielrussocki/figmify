export interface FigmaFontName {
  readonly family: string
  readonly style: string
}

interface FigmaFont {
  readonly fontName: FigmaFontName
}

interface FigmaFontsApi {
  listAvailableFontsAsync(): Promise<readonly FigmaFont[]>
  loadFontAsync(fontName: FigmaFontName): Promise<void>
}

export interface FontCatalog {
  listAvailableFonts(): Promise<readonly FigmaFontName[]>
  isAvailable(fontName: FigmaFontName): Promise<boolean>
  loadFont(fontName?: FigmaFontName): Promise<FigmaFontName>
}

export const DEFAULT_FIGMA_FONT: FigmaFontName = {
  family: 'Inter',
  style: 'Regular',
}

export function createFontCatalog(figmaFonts: FigmaFontsApi): FontCatalog {
  async function listAvailableFonts(): Promise<readonly FigmaFontName[]> {
    const availableFonts = await figmaFonts.listAvailableFontsAsync()

    return availableFonts.map((font) => font.fontName)
  }

  return {
    listAvailableFonts,
    async isAvailable(fontName: FigmaFontName): Promise<boolean> {
      const availableFonts = await listAvailableFonts()

      return availableFonts.some(
        (availableFont) => availableFont.family === fontName.family && availableFont.style === fontName.style,
      )
    },
    async loadFont(fontName: FigmaFontName = DEFAULT_FIGMA_FONT): Promise<FigmaFontName> {
      await figmaFonts.loadFontAsync(fontName)

      return fontName
    },
  }
}
