import { describe, expect, it } from 'vitest'
import { createPageReader } from '../../src/infrastructure/figma/page-reader'

interface FakePage {
  id: string
  children: unknown[]
}

interface FakeFigmaDocument {
  currentPage: FakePage
  root: {
    children: FakePage[]
  }
}

function createFigmaDocument(currentPage: FakePage, pages: FakePage[]): FakeFigmaDocument {
  return {
    currentPage,
    root: { children: pages },
  }
}

describe('Figma page reader', () => {
  it('reads the active page at the start and reports that it has no nodes', () => {
    const startPage = { id: 'start-page', children: [] }
    const figmaDocument = createFigmaDocument(startPage, [startPage])
    const pageReader = createPageReader(figmaDocument)

    expect(pageReader.readStartPage()).toEqual({ id: 'start-page', hasNodes: false })
  })

  it('reports nodes on the active start page', () => {
    const startPage = { id: 'start-page', children: [{ id: 'existing-node' }] }
    const figmaDocument = createFigmaDocument(startPage, [startPage])

    expect(createPageReader(figmaDocument).readStartPage()).toEqual({ id: 'start-page', hasNodes: true })
  })

  it('checks whether the captured start page still exists after the active page changes', () => {
    const startPage = { id: 'start-page', children: [] }
    const otherPage = { id: 'other-page', children: [] }
    const activePages = [startPage]
    const pages = [startPage, otherPage]
    const figmaDocument: FakeFigmaDocument = {
      get currentPage(): FakePage {
        return activePages[0]
      },
      root: { children: pages },
    }
    const pageReader = createPageReader(figmaDocument)
    const capturedPage = pageReader.readStartPage()

    activePages.splice(0, 1, otherPage)
    expect(pageReader.pageExists(capturedPage.id)).toBe(true)

    pages.splice(0, 1)
    expect(pageReader.pageExists(capturedPage.id)).toBe(false)
  })
})
