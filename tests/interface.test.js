import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('przełącznik pokazuje wyłącznie nazwy Nauka i Sprawdzian', () => {
  assert.match(html, /data-mode="learn"[\s\S]*?<strong>Nauka<\/strong>/);
  assert.match(html, /data-mode="quiz"[\s\S]*?<strong>Sprawdzian<\/strong>/);
  assert.doesNotMatch(html, /<small>\s*TRYB\s*<\/small>/i);
});
