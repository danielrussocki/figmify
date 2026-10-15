import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { URL } from 'node:url'

const uiTemplatePath = new URL('../ui.template.html', import.meta.url)
const uiBundlePath = new URL('../dist/ui.js', import.meta.url)
const uiDocumentPath = new URL('../ui.html', import.meta.url)

await build({
  entryPoints: ['code.ts', 'ui.ts'],
  bundle: true,
  target: 'es2020',
  outdir: 'dist',
  outbase: '.',
})

const [uiTemplate, uiBundle] = await Promise.all([
  readFile(uiTemplatePath, 'utf8'),
  readFile(uiBundlePath, 'utf8'),
])

const embeddedUiBundle = uiBundle.replace(/<\/script/gi, '<\\/script')
const uiDocument = uiTemplate.replace('{{UI_BUNDLE}}', embeddedUiBundle)

await writeFile(uiDocumentPath, uiDocument)
