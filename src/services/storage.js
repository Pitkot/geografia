const STORAGE_KEY = 'mapa101-progress-v1';

const EMPTY_STATE = {
  correct: 0,
  attempts: 0,
  streak: 0,
  bestStreak: 0,
  mastered: []
};

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      ...EMPTY_STATE,
      ...saved,
      mastered: Array.isArray(saved?.mastered) ? saved.mastered : []
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Aplikacja nadal działa, gdy przeglądarka blokuje pamięć lokalną.
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Brak dostępu do localStorage nie może blokować resetu w bieżącej sesji.
  }
  return { ...EMPTY_STATE, mastered: [] };
}