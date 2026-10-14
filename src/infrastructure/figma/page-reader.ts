export interface StartPage {
  readonly id: string
  readonly hasNodes: boolean
}

export interface PageReader {
  readStartPage(): StartPage
  pageExists(pageId: string): boolean
}

interface PageLike {
  readonly id: string
  readonly children: readonly unknown[]
}

interface FigmaDocumentLike {
  readonly currentPage: PageLike
  readonly root: {
    readonly children: readonly PageLike[]
  }
}

export function createPageReader(figmaDocument: FigmaDocumentLike): PageReader {
  return {
    readStartPage(): StartPage {
      const page = figmaDocument.currentPage

      return {
        id: page.id,
        hasNodes: page.children.length > 0,
      }
    },
    pageExists(pageId: string): boolean {
      return figmaDocument.root.children.some((page) => page.id === pageId)
    },
  }
}
