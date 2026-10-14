import { describe, expect, it } from 'vitest'
import type { FontReference } from '../../src/contracts/messages'
import {
  createFontSubstitutionPlan,
  groupFontUses,
  type FontUse,
} from '../../src/domain/font-substitution'
import { DEFAULT_FIGMA_FONT } from '../../src/infrastructure/figma/font-catalog'

const robotoRegular: FontReference = { family: 'Roboto', style: 'Regular' }
const robotoBold: FontReference = { family: 'Roboto', style: 'Bold' }

describe('font substitution', () => {
  it('groups every unavailable font use into one choice per family and style', () => {
    const fontUses: readonly FontUse[] = [
      { id: 'headline', sourceFont: robotoRegular },
      { id: 'call-to-action', sourceFont: robotoBold },
      { id: 'body-copy', sourceFont: robotoRegular },
    ]

    expect(groupFontUses(fontUses)).toEqual([
      {
        sourceFont: robotoRegular,
        uses: [
          { id: 'headline', sourceFont: robotoRegular },
          { id: 'body-copy', sourceFont: robotoRegular },
        ],
      },
      {
        sourceFont: robotoBold,
        uses: [{ id: 'call-to-action', sourceFont: robotoBold }],
      },
    ])
  })

  it('applies the chosen replacement to every use in its family and style group', () => {
    const fontUses: readonly FontUse[] = [
      { id: 'headline', sourceFont: robotoRegular },
      { id: 'body-copy', sourceFont: robotoRegular },
      { id: 'call-to-action', sourceFont: robotoBold },
    ]
    const replacement = { family: 'Inter', style: 'Medium' }

    expect(
      createFontSubstitutionPlan(fontUses, [
        { sourceFont: robotoRegular, selection: replacement },
        { sourceFont: robotoBold, selection: { family: 'Inter', style: 'Bold' } },
      ], DEFAULT_FIGMA_FONT),
    ).toEqual([
      { id: 'headline', font: replacement },
      { id: 'body-copy', font: replacement },
      { id: 'call-to-action', font: { family: 'Inter', style: 'Bold' } },
    ])
  })

  it('uses Figma default font for every use when the selector is cancelled', () => {
    const fontUses: readonly FontUse[] = [
      { id: 'headline', sourceFont: robotoRegular },
      { id: 'body-copy', sourceFont: robotoRegular },
    ]

    expect(
      createFontSubstitutionPlan(fontUses, [{ sourceFont: robotoRegular, selection: 'default' }], DEFAULT_FIGMA_FONT),
    ).toEqual([
      { id: 'headline', font: DEFAULT_FIGMA_FONT },
      { id: 'body-copy', font: DEFAULT_FIGMA_FONT },
    ])
  })
})
