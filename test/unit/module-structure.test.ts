import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(__dirname, '../..')

const expectedModules = [
  'src/contracts/api-v1.ts',
  'src/contracts/messages.ts',
  'src/domain/import-session.ts',
  'src/domain/placement.ts',
  'src/domain/font-substitution.ts',
  'src/domain/render-plan.ts',
  'src/application/import-web-design.ts',
  'src/infrastructure/api/figmify-client.ts',
  'src/infrastructure/figma/page-reader.ts',
  'src/infrastructure/figma/font-catalog.ts',
  'src/infrastructure/figma/resource-loader.ts',
  'src/infrastructure/figma/document-renderer.ts',
  'src/ui/controller.ts',
]

function sourceFor(modulePath: string): string {
  return readFileSync(resolve(projectRoot, modulePath), 'utf8')
}

describe('module structure', () => {
  it('provides every module planned for the MVP', () => {
    for (const modulePath of expectedModules) {
      expect(existsSync(resolve(projectRoot, modulePath))).toBe(true)
    }
  })

  it('keeps imports within the planned dependency boundaries', () => {
    for (const modulePath of expectedModules) {
      const source = sourceFor(modulePath)

      if (modulePath.startsWith('src/ui/')) {
        expect(source).not.toMatch(/from\s+['"][^'"]*\/(?:domain|application|infrastructure)\//)
      }

      if (modulePath.startsWith('src/domain/')) {
        expect(source).not.toMatch(/from\s+['"][^'"]*\/(?:ui|application|infrastructure)\//)
        expect(source).not.toMatch(/\bfigma\b/)
      }

      if (modulePath.startsWith('src/application/')) {
        expect(source).not.toMatch(/from\s+['"][^'"]*\/ui\//)
        expect(source).not.toMatch(/\bfigma\b/)
      }

      if (modulePath.startsWith('src/infrastructure/')) {
        expect(source).not.toMatch(/from\s+['"][^'"]*\/ui\//)
      }
    }
  })
})
