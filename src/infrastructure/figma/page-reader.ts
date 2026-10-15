export interface StartPage {
  readonly id: string
  readonly hasNodes: boolean
}

export interface PageReader {
  readStartPage(): StartPage
  pageExists(pageId: string): boolean
  getVisibleContentBounds(pageId: string, excludingTemporaryRoot: { readonly id?: string }): VisibleContentBounds | undefined
}

export interface VisibleContentBounds {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

interface PageChild {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
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
    getVisibleContentBounds(pageId: string, excludingTemporaryRoot: { readonly id?: string }): VisibleContentBounds | undefined {
      const page = figmaDocument.root.children.find((candidate) => candidate.id === pageId)
      const nodes = (page?.children as readonly PageChild[] | undefined)?.filter((node) => node.id !== excludingTemporaryRoot.id) ?? []
      if (nodes.length === 0) {
        return undefined
      }

      return nodes.reduce<VisibleContentBounds>((bounds, node) => ({
        left: Math.min(bounds.left, node.x),
        top: Math.min(bounds.top, node.y),
        right: Math.max(bounds.right, node.x + node.width),
        bottom: Math.max(bounds.bottom, node.y + node.height),
      }), {
        left: nodes[0].x,
        top: nodes[0].y,
        right: nodes[0].x + nodes[0].width,
        bottom: nodes[0].y + nodes[0].height,
      })
    },
  }
}
