import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_FIGMA_FONT,
  createFontCatalog,
  type FigmaFontName,
} from '../../src/infrastructure/figma/font-catalog'

interface FakeFigmaFonts {
  listAvailableFontsAsync(): Promise<readonly { fontName: FigmaFontName }[]>
  loadFontAsync(fontName: FigmaFontName): Promise<void>
}

function createFigmaFonts(availableFonts: readonly FigmaFontName[]): FakeFigmaFonts {
  return {
    listAvailableFontsAsync: vi.fn().mockResolvedValue(availableFonts.map((fontName) => ({ fontName }))),
    loadFontAsync: vi.fn().mockResolvedValue(undefined),
  }
}

describe('Figma font catalog', () => {
  it('lists the font names available in Figma', async () => {
    const interRegular = { family: 'Inter', style: 'Regular' }
    const interBold = { family: 'Inter', style: 'Bold' }
    const figmaFonts = createFigmaFonts([interRegular, interBold])

    await expect(createFontCatalog(figmaFonts).listAvailableFonts()).resolves.toEqual([interRegular, interBold])
  })

  it('detects whether a family and style is unavailable', async () => {
    const figmaFonts = createFigmaFonts([{ family: 'Inter', style: 'Regular' }])
    const fontCatalog = createFontCatalog(figmaFonts)

    await expect(fontCatalog.isAvailable({ family: 'Inter', style: 'Regular' })).resolves.toBe(true)
    await expect(fontCatalog.isAvailable({ family: 'Roboto', style: 'Regular' })).resolves.toBe(false)
  })

  it('loads the selected available font before it is returned for text creation', async () => {
    const selectedFont = { family: 'Roboto', style: 'Medium' }
    const figmaFonts = createFigmaFonts([selectedFont])

    await expect(createFontCatalog(figmaFonts).loadFont(selectedFont)).resolves.toEqual(selectedFont)
    expect(figmaFonts.loadFontAsync).toHaveBeenCalledExactlyOnceWith(selectedFont)
  })

  it('loads and returns Figma default font when no selection is supplied', async () => {
    const figmaFonts = createFigmaFonts([DEFAULT_FIGMA_FONT])

    await expect(createFontCatalog(figmaFonts).loadFont()).resolves.toEqual(DEFAULT_FIGMA_FONT)
    expect(figmaFonts.loadFontAsync).toHaveBeenCalledExactlyOnceWith(DEFAULT_FIGMA_FONT)
  })
})
