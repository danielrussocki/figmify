/* global process */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()

test('build emits the controller and UI bundles', () => {
  assert.ok(existsSync(resolve(projectRoot, 'dist', 'code.js')))
  assert.ok(existsSync(resolve(projectRoot, 'dist', 'ui.js')))
})

test('the UI document embeds the UI bundle without a relative path', () => {
  const uiDocument = readFileSync(resolve(projectRoot, 'ui.html'), 'utf8')
  const manifest = JSON.parse(
    readFileSync(resolve(projectRoot, 'manifest.json'), 'utf8'),
  )

  assert.equal(manifest.main, 'dist/code.js')
  assert.match(
    uiDocument,
    /<script(?![^>]*\bsrc\s*=)[^>]*>\s*\S[\s\S]*?<\/script>/i,
  )
  assert.doesNotMatch(uiDocument, /(?:\.\/)?dist\/ui\.js/)
})

test('the packaged UI contains the import form visible in Figma', () => {
  const uiDocument = readFileSync(resolve(projectRoot, 'ui.html'), 'utf8')

  assert.match(uiDocument, /<h1 id="figmify-title">Import web design<\/h1>/)
  assert.match(uiDocument, /<input id="url-input" name="url" type="text" required>/)
  assert.match(uiDocument, /<button id="import-submit" type="submit">Import<\/button>/)
})
