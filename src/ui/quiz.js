function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function createQuestion(pool, previousId = '', targetId = '') {
  if (pool.length < 4) return null;
  const forcedTarget = targetId ? pool.find((location) => location.id === targetId) : null;
  if (targetId && !forcedTarget) return null;
  const possibleTargets = pool.filter((location) => location.id !== previousId);
  const target = forcedTarget || possibleTargets[Math.floor(Math.random() * possibleTargets.length)] || pool[0];
  const usedNames = new Set([target.name.toLocaleLowerCase('pl-PL')]);
  const candidates = [
    ...shuffle(pool.filter((location) => location.id !== target.id && location.category === target.category)),
    ...shuffle(pool.filter((location) => location.id !== target.id && location.region === target.region && location.category !== target.category)),
    ...shuffle(pool.filter((location) => location.id !== target.id && location.region !== target.region && location.category !== target.category))
  ];
  const distractors = [];
  for (const candidate of candidates) {
    const name = candidate.name.toLocaleLowerCase('pl-PL');
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  return { target, options: shuffle([target, ...distractors]) };
}

export function accuracy(progress) {
  const incorrectIds = new Set((progress.incorrect || []).map((entry) => entry.targetId));
  const masteredIds = new Set((progress.mastered || []).filter((id) => !incorrectIds.has(id)));
  const answeredLocations = masteredIds.size + incorrectIds.size;
  if (!answeredLocations) return 0;
  return Math.round(masteredIds.size / answeredLocations * 100);
}

export function recordAnswer(progress, targetId, selectedId) {
  const correct = targetId === selectedId;
  const mastered = new Set(progress.mastered || []);
  const incorrect = (progress.incorrect || []).filter((entry) => entry.targetId !== targetId);
  const streak = correct ? (progress.streak || 0) + 1 : 0;

  if (correct) {
    mastered.add(targetId);
  } else {
    mastered.delete(targetId);
    incorrect.push({ targetId, selectedId });
  }

  return {
    ...progress,
    correct: (progress.correct || 0) + (correct ? 1 : 0),
    attempts: (progress.attempts || 0) + 1,
    streak,
    bestStreak: Math.max(progress.bestStreak || 0, streak),
    mastered: [...mastered],
    incorrect
  };
}