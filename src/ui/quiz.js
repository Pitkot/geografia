function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function createQuestion(pool, previousId = '') {
  if (pool.length < 4) return null;
  const possibleTargets = pool.filter((location) => location.id !== previousId);
  const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)] || pool[0];
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
  if (!progress.attempts) return 0;
  return Math.round(progress.correct / progress.attempts * 100);
}