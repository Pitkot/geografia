import test from 'node:test';
import assert from 'node:assert/strict';
import { accuracy, createQuestion } from '../src/ui/quiz.js';

const pool = [
  { id: 'a', name: 'A', category: 'Rzeka', region: 'europe' },
  { id: 'b', name: 'B', category: 'Rzeka', region: 'europe' },
  { id: 'c', name: 'C', category: 'Rzeka', region: 'asia' },
  { id: 'd', name: 'D', category: 'Morze', region: 'europe' },
  { id: 'e', name: 'E', category: 'Jezioro', region: 'africa' }
];

test('pytanie zawiera cel i cztery unikalne odpowiedzi', () => {
  for (let index = 0; index < 20; index += 1) {
    const question = createQuestion(pool);
    assert.ok(question.target);
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map((option) => option.id)).size, 4);
    assert.equal(new Set(question.options.map((option) => option.name)).size, 4);
    assert.ok(question.options.some((option) => option.id === question.target.id));
  }
});

test('powtórzona nazwa obiektu nie tworzy identycznych odpowiedzi', () => {
  const duplicateNames = [
    ...pool,
    { id: 'f', name: 'A', category: 'Morze', region: 'asia' }
  ];
  for (let index = 0; index < 20; index += 1) {
    const question = createQuestion(duplicateNames);
    assert.equal(new Set(question.options.map((option) => option.name)).size, 4);
  }
});

test('poprzedni cel nie jest od razu losowany ponownie', () => {
  for (let index = 0; index < 20; index += 1) {
    assert.notEqual(createQuestion(pool, 'a').target.id, 'a');
  }
});

test('quiz odrzuca pulę mniejszą niż cztery miejsca', () => {
  assert.equal(createQuestion(pool.slice(0, 3)), null);
});

test('skuteczność jest zaokrąglana do pełnego procentu', () => {
  assert.equal(accuracy({ correct: 0, attempts: 0 }), 0);
  assert.equal(accuracy({ correct: 2, attempts: 3 }), 67);
});