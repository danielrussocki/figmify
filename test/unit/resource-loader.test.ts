import { describe, expect, it, vi } from 'vitest'
import type { FigmaRect } from '../../src/contracts/api-v1'
import {
  createResourceLoader,
  type FigmaImage,
  type NonTypographyResource,
} from '../../src/infrastructure/figma/resource-loader'

interface FakeFigmaImages {
  createImageAsync(source: string): Promise<FigmaImage>
}

function createFigmaImages(): FakeFigmaImages {
  return {
    createImageAsync: vi.fn(),
  }
}

const resourceRect: FigmaRect = {
  x: 80,
  y: 208,
  width: 640,
  height: 360,
  top: 208,
  left: 80,
}

describe('non-typography resource loader', () => {
  it('resolves image and icon resources through Figma', async () => {
    const figmaImages = createFigmaImages()
    const heroImage = { hash: 'hero-image-hash' }
    const menuIcon = { hash: 'menu-icon-hash' }
    figmaImages.createImageAsync
      .mockResolvedValueOnce(heroImage)
      .mockResolvedValueOnce(menuIcon)
    const resources: readonly NonTypographyResource[] = [
      {
        id: 'hero-image',
        kind: 'image',
        source: 'https://images.example.com/hero.jpg',
        rect: resourceRect,
      },
      {
        id: 'menu-icon',
        kind: 'icon',
        source: 'https://images.example.com/menu.svg',
        rect: { ...resourceRect, width: 24, height: 24 },
      },
    ]

    await expect(createResourceLoader(figmaImages).resolve(resources)).resolves.toEqual([
      {
        id: 'hero-image',
        kind: 'resolved',
        imageHash: 'hero-image-hash',
      },
      {
        id: 'menu-icon',
        kind: 'resolved',
        imageHash: 'menu-icon-hash',
      },
    ])
    expect(figmaImages.createImageAsync).toHaveBeenNthCalledWith(1, 'https://images.example.com/hero.jpg')
    expect(figmaImages.createImageAsync).toHaveBeenNthCalledWith(2, 'https://images.example.com/menu.svg')
  })

  it('creates an English placeholder with the original geometry when Figma cannot resolve a resource', async () => {
    const figmaImages = createFigmaImages()
    figmaImages.createImageAsync.mockRejectedValueOnce(new Error('Resource unavailable'))
    const icon: NonTypographyResource = {
      id: 'account-icon',
      kind: 'icon',
      source: 'https://images.example.com/account.svg',
      rect: { ...resourceRect, width: 32, height: 32 },
    }

    await expect(createResourceLoader(figmaImages).resolve([icon])).resolves.toEqual([
      {
        id: 'account-icon',
        kind: 'placeholder',
        rect: icon.rect,
        label: 'Icon resource unavailable.',
      },
    ])
  })
})
