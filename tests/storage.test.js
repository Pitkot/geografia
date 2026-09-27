import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
global.localStorage = {
  getItem(key) {
    return memory.get(key) ?? null;
  },
  setItem(key, value) {
    memory.set(key, value);
  },
  removeItem(key) {
    memory.delete(key);
  }
};

const { clearProgress, loadProgress, saveProgress } = await import('../src/services/storage.js');

test('stary zapis postępu jest migrowany z pustą kolejką poprawek', () => {
  memory.set('mapa101-progress-v1', JSON.stringify({ correct: 2, attempts: 3, mastered: ['a'] }));
  const progress = loadProgress();
  assert.deepEqual(progress.mastered, ['a']);
  assert.deepEqual(progress.incorrect, []);
});

test('kolejka błędnych odpowiedzi jest zapisywana i wczytywana', () => {
  const progress = {
    correct: 1,
    attempts: 2,
    streak: 0,
    bestStreak: 1,
    mastered: ['a'],
    incorrect: [{ targetId: 'b', selectedId: 'c' }]
  };
  saveProgress(progress);
  assert.deepEqual(loadProgress(), progress);
});

test('reset zwraca niezależny, pusty stan', () => {
  const first = clearProgress();
  first.mastered.push('a');
  first.incorrect.push({ targetId: 'b', selectedId: 'c' });
  const second = clearProgress();
  assert.deepEqual(second.mastered, []);
  assert.deepEqual(second.incorrect, []);
});