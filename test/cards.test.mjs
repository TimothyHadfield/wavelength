// Built-in spectrum cards: count, format, no duplicates (either way round), nothing too long for the card.
//   node --test test/      (SITE_ROOT=<folder> tests another copy)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = process.env.SITE_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const box = {};
vm.runInNewContext(readFileSync(join(ROOT, 'js/cards.js'), 'utf8'), { globalThis: box, window: undefined });
const LISTS = box.WL_LISTS;
const all = LISTS.flatMap(l => l.cards);

test('at least 400 built-in cards', () => {
  assert.ok(all.length >= 400, `only ${all.length}`);
});

test('every card has two different, trimmed, non-empty sides', () => {
  for (const c of all) {
    assert.ok(c.left && c.right, JSON.stringify(c));
    assert.equal(c.left, c.left.trim());
    assert.equal(c.right, c.right.trim());
    assert.ok(!c.left.includes('|') && !c.right.includes('|'), JSON.stringify(c));
    assert.notEqual(c.left.toLowerCase(), c.right.toLowerCase());
  }
});

test('no duplicate cards, in either order, across all lists', () => {
  const seen = new Map();
  for (const l of LISTS) for (const c of l.cards) {
    const k = [c.left, c.right].map(s => s.toLowerCase()).sort().join('|');
    assert.ok(!seen.has(k), `"${c.left} | ${c.right}" in ${l.name} repeats one in ${seen.get(k)}`);
    seen.set(k, l.name);
  }
});

test('each side fits the card (at most 34 characters)', () => {
  for (const c of all) for (const s of [c.left, c.right]) assert.ok(s.length <= 34, s);
});

test('list names are unique and every list is built-in', () => {
  assert.equal(new Set(LISTS.map(l => l.name)).size, LISTS.length);
  for (const l of LISTS) { assert.equal(l.builtin, true); assert.ok(l.cards.length >= 20, l.name); }
});
