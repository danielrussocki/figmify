import type { FigmaRect } from '../../contracts/api-v1'

export interface FigmaImage {
  readonly hash: string
}

interface FigmaImagesApi {
  createImageAsync(source: string): Promise<FigmaImage>
}

export interface NonTypographyResource {
  readonly id: string
  readonly kind: 'image' | 'icon'
  readonly source: string
  readonly rect: FigmaRect
}

export interface ResolvedResource {
  readonly id: string
  readonly kind: 'resolved'
  readonly imageHash: string
}

export interface ResourcePlaceholder {
  readonly id: string
  readonly kind: 'placeholder'
  readonly rect: FigmaRect
  readonly label: string
}

export type NonTypographyResourceResult = ResolvedResource | ResourcePlaceholder

export interface ResourceLoader {
  resolve(resources: readonly NonTypographyResource[]): Promise<readonly NonTypographyResourceResult[]>
}

function createPlaceholder(resource: NonTypographyResource): ResourcePlaceholder {
  const resourceName = resource.kind === 'icon' ? 'Icon' : 'Image'

  return {
    id: resource.id,
    kind: 'placeholder',
    rect: resource.rect,
    label: `${resourceName} resource unavailable.`,
  }
}

export function createResourceLoader(figmaImages: FigmaImagesApi): ResourceLoader {
  return {
    async resolve(resources: readonly NonTypographyResource[]): Promise<readonly NonTypographyResourceResult[]> {
      return Promise.all(
        resources.map(async (resource): Promise<NonTypographyResourceResult> => {
          try {
            const image = await figmaImages.createImageAsync(resource.source)

            return {
              id: resource.id,
              kind: 'resolved',
              imageHash: image.hash,
            }
          } catch {
            return createPlaceholder(resource)
          }
        }),
      )
    },
  }
}
