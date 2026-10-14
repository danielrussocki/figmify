import type { AvailableFont, FontReference } from '../contracts/messages'

export interface FontUse {
  readonly id: string
  readonly sourceFont: FontReference
}

export interface FontUseGroup {
  readonly sourceFont: FontReference
  readonly uses: readonly FontUse[]
}

export interface FontSubstitutionChoice {
  readonly sourceFont: FontReference
  readonly selection: AvailableFont | 'default'
}

export interface PlannedFontUse {
  readonly id: string
  readonly font: AvailableFont
}

function fontKey(font: FontReference): string {
  return `${font.family}\u0000${font.style}`
}

export function groupFontUses(fontUses: readonly FontUse[]): readonly FontUseGroup[] {
  const groups = new Map<string, { sourceFont: FontReference; uses: FontUse[] }>()

  for (const fontUse of fontUses) {
    const key = fontKey(fontUse.sourceFont)
    const group = groups.get(key)

    if (group === undefined) {
      groups.set(key, { sourceFont: fontUse.sourceFont, uses: [fontUse] })
      continue
    }

    group.uses.push(fontUse)
  }

  return [...groups.values()]
}

export function createFontSubstitutionPlan(
  fontUses: readonly FontUse[],
  choices: readonly FontSubstitutionChoice[],
  defaultFont: AvailableFont,
): readonly PlannedFontUse[] {
  const selections = new Map<string, AvailableFont>()

  for (const choice of choices) {
    selections.set(
      fontKey(choice.sourceFont),
      choice.selection === 'default' ? defaultFont : choice.selection,
    )
  }

  return fontUses.map((fontUse) => ({
    id: fontUse.id,
    font: selections.get(fontKey(fontUse.sourceFont)) ?? defaultFont,
  }))
}
