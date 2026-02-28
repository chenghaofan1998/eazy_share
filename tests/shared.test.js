import test from 'node:test';
import assert from 'node:assert/strict';
import { clampMaxHeight, getGridCount, validateOptionalUrl } from '../src/extension/shared.js';

test('validateOptionalUrl accepts regular web urls', () => {
  assert.equal(validateOptionalUrl('https://example.com/a'), true);
  assert.equal(validateOptionalUrl('https://foo.feishu.cn/docx/abc'), true);
});

test('validateOptionalUrl rejects invalid urls', () => {
  assert.equal(validateOptionalUrl('not-a-url'), false);
  assert.equal(validateOptionalUrl(''), true);
});

test('getGridCount maps output mode', () => {
  assert.equal(getGridCount('long'), 1);
  assert.equal(getGridCount('grid4'), 4);
  assert.equal(getGridCount('grid3'), 3);
  assert.equal(getGridCount('grid6'), 6);
  assert.equal(getGridCount('grid9'), 9);
});

test('clampMaxHeight returns positive integer or zero', () => {
  assert.equal(clampMaxHeight(1200.9), 1200);
  assert.equal(clampMaxHeight('0'), 0);
  assert.equal(clampMaxHeight('-5'), 0);
  assert.equal(clampMaxHeight('abc'), 0);
});
