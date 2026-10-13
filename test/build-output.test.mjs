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

test('the plugin configuration loads bundles from dist', () => {
  const uiDocument = readFileSync(resolve(projectRoot, 'ui.html'), 'utf8')
  const manifest = JSON.parse(
    readFileSync(resolve(projectRoot, 'manifest.json'), 'utf8'),
  )

  assert.equal(manifest.main, 'dist/code.js')
  assert.match(uiDocument, /<script src="dist\/ui\.js"><\/script>/)
})
