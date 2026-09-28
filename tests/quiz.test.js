import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accuracy,
  createQuestion,
  recordAnswer,
  updateCorrectionQueue
} from '../src/ui/quiz.js';

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

test('pytanie poprawkowe zawsze używa wskazanego celu', () => {
  for (let index = 0; index < 20; index += 1) {
    const question = createQuestion(pool, '', 'c');
    assert.equal(question.target.id, 'c');
    assert.equal(question.options.length, 4);
    assert.ok(question.options.some((option) => option.id === 'c'));
  }
});

test('nieistniejący cel poprawki jest odrzucany', () => {
  assert.equal(createQuestion(pool, '', 'nie-ma'), null);
});

test('sprawdzian odrzuca pulę mniejszą niż cztery miejsca', () => {
  assert.equal(createQuestion(pool.slice(0, 3)), null);
});

test('skuteczność opisuje aktualny stan wiedzy', () => {
  assert.equal(accuracy({ mastered: [], incorrect: [] }), 0);
  assert.equal(accuracy({ mastered: ['a', 'b'], incorrect: [{ targetId: 'c', selectedId: 'd' }] }), 67);
  assert.equal(accuracy({ mastered: ['a', 'b', 'c'], incorrect: [] }), 100);
});

test('błędna odpowiedź trafia do kolejki i usuwa wcześniejsze opanowanie', () => {
  const progress = recordAnswer({
    correct: 1,
    attempts: 1,
    streak: 1,
    bestStreak: 1,
    mastered: ['a'],
    incorrect: []
  }, 'a', 'b');

  assert.equal(progress.attempts, 2);
  assert.equal(progress.correct, 1);
  assert.equal(progress.streak, 0);
  assert.deepEqual(progress.mastered, []);
  assert.deepEqual(progress.incorrect, [{ targetId: 'a', selectedId: 'b' }]);
});

test('kolejna pomyłka aktualizuje wpis zamiast go duplikować', () => {
  const progress = recordAnswer({
    correct: 0,
    attempts: 1,
    streak: 0,
    bestStreak: 0,
    mastered: [],
    incorrect: [{ targetId: 'a', selectedId: 'b' }]
  }, 'a', 'c');

  assert.deepEqual(progress.incorrect, [{ targetId: 'a', selectedId: 'c' }]);
});

test('poprawienie błędu usuwa go z kolejki i przywraca 100%', () => {
  const progress = recordAnswer({
    correct: 2,
    attempts: 3,
    streak: 0,
    bestStreak: 2,
    mastered: ['a', 'b'],
    incorrect: [{ targetId: 'c', selectedId: 'd' }]
  }, 'c', 'c');

  assert.deepEqual(new Set(progress.mastered), new Set(['a', 'b', 'c']));
  assert.deepEqual(progress.incorrect, []);
  assert.equal(progress.correct, 3);
  assert.equal(progress.attempts, 4);
  assert.equal(accuracy(progress), 100);
});

test('błędna poprawa wraca na koniec kolejki bez duplikatów', () => {
  assert.deepEqual(updateCorrectionQueue(['a', 'b', 'a'], 'a', false), ['b', 'a']);
});

test('poprawna odpowiedź usuwa obiekt z kolejki poprawek', () => {
  assert.deepEqual(updateCorrectionQueue(['a', 'b', 'a'], 'a', true), ['b']);
});

test('pełna seria poprawek kończy się pustą kolejką i skutecznością 100%', () => {
  let progress = {
    correct: 0,
    attempts: 2,
    streak: 0,
    bestStreak: 0,
    mastered: [],
    incorrect: [
      { targetId: 'a', selectedId: 'b' },
      { targetId: 'c', selectedId: 'd' }
    ]
  };
  let queue = ['a', 'c'];

  progress = recordAnswer(progress, 'a', 'b');
  queue = updateCorrectionQueue(queue, 'a', false);
  assert.deepEqual(queue, ['c', 'a']);
  assert.deepEqual(progress.incorrect, [
    { targetId: 'c', selectedId: 'd' },
    { targetId: 'a', selectedId: 'b' }
  ]);

  progress = recordAnswer(progress, 'c', 'c');
  queue = updateCorrectionQueue(queue, 'c', true);
  assert.deepEqual(queue, ['a']);
  assert.deepEqual(progress.incorrect, [{ targetId: 'a', selectedId: 'b' }]);

  progress = recordAnswer(progress, 'a', 'a');
  queue = updateCorrectionQueue(queue, 'a', true);
  assert.deepEqual(queue, []);
  assert.deepEqual(new Set(progress.mastered), new Set(['a', 'c']));
  assert.deepEqual(progress.incorrect, []);
  assert.equal(accuracy(progress), 100);
});
