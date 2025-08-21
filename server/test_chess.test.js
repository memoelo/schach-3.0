import test from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'

test('start position legal move count', () => {
  const c = new Chess()
  assert.equal(c.moves().length, 20)
})
