import { formatCoordinates } from './data/projection.js';
import { loadProgress, saveProgress, clearProgress } from './services/storage.js';
import { createMapController } from './ui/map.js';
import { accuracy, createQuestion, recordAnswer } from './ui/quiz.js';

const REGION_VIEWS = {
  world: { id: 'world', name: 'Cały świat', color: '#5d4bdb', latitude: 8, longitude: 8, zoom: 1 },
  europe: { id: 'europe', latitude: 51, longitude: 17, zoom: 3.15 },
  asia: { id: 'asia', latitude: 38, longitude: 95, zoom: 1.75 },
  africa: { id: 'africa', latitude: 2, longitude: 20, zoom: 2.15 },
  'north-america': { id: 'north-america', latitude: 43, longitude: -105, zoom: 1.85 },
  'south-america': { id: 'south-america', latitude: -20, longitude: -60, zoom: 2.05 },
  oceania: { id: 'oceania', latitude: -7, longitude: 10, zoom: 1.08 }
};

const CATEGORY_SHAPES = {
  'Półwysep': 'triangle',
  'Morze': 'circle',
  'Zatoka': 'semicircle',
  'Cieśnina / kanał': 'diamond',
  'Wyspa / archipelag': 'hexagon',
  'Rzeka': 'diamond',
  'Jezioro': 'square',
  'Kraina': 'star'
};

const elements = {
  regionList: document.querySelector('#regionList'),
  categoryList: document.querySelector('#categoryList'),
  searchInput: document.querySelector('#searchInput'),
  searchResults: document.querySelector('#searchResults'),
  sidebar: document.querySelector('.sidebar'),
  openFilters: document.querySelector('#openFilters'),
  closeFilters: document.querySelector('#closeFilters'),
  currentRegionName: document.querySelector('#currentRegionName'),
  contextDot: document.querySelector('#contextDot'),
  visibleCount: document.querySelector('#visibleCount'),
  totalLocations: document.querySelector('#totalLocations'),
  map: document.querySelector('#map'),
  mapWorld: document.querySelector('#mapWorld'),
  markerLayer: document.querySelector('#markerLayer'),
  zoomIn: document.querySelector('#zoomIn'),
  zoomOut: document.querySelector('#zoomOut'),
  resetMap: document.querySelector('#resetMap'),
  legend: document.querySelector('#legend'),
  welcomeCard: document.querySelector('#welcomeCard'),
  placeCard: document.querySelector('#placeCard'),
  quizCard: document.querySelector('#quizCard'),
  placeImage: document.querySelector('#placeImage'),
  photoFallback: document.querySelector('#photoFallback'),
  fallbackIcon: document.querySelector('#fallbackIcon'),
  fallbackText: document.querySelector('#fallbackText'),
  placeNumber: document.querySelector('#placeNumber'),
  placeCategory: document.querySelector('#placeCategory'),
  placeRegion: document.querySelector('#placeRegion'),
  placeName: document.querySelector('#placeName'),
  placeCoordinates: document.querySelector('#placeCoordinates'),
  factsList: document.querySelector('#factsList'),
  sourceLink: document.querySelector('#sourceLink'),
  previousPlace: document.querySelector('#previousPlace'),
  nextPlace: document.querySelector('#nextPlace'),
  placePosition: document.querySelector('#placePosition'),
  placeTotal: document.querySelector('#placeTotal'),
  quizKicker: document.querySelector('#quizKicker'),
  quizOptions: document.querySelector('#quizOptions'),
  quizFeedback: document.querySelector('#quizFeedback'),
  nextQuestion: document.querySelector('#nextQuestion'),
  headerScore: document.querySelector('#headerScore'),
  streakValue: document.querySelector('#streakValue'),
  quizCorrect: document.querySelector('#quizCorrect'),
  quizAttempts: document.querySelector('#quizAttempts'),
  quizAccuracy: document.querySelector('#quizAccuracy'),
  correctionsPanel: document.querySelector('#correctionsPanel'),
  incorrectCount: document.querySelector('#incorrectCount'),
  correctionsEmpty: document.querySelector('#correctionsEmpty'),
  incorrectAnswers: document.querySelector('#incorrectAnswers'),
  reviewIncorrect: document.querySelector('#reviewIncorrect'),
  masteredCount: document.querySelector('#masteredCount'),
  progressPercent: document.querySelector('#progressPercent'),
  progressBar: document.querySelector('#progressBar'),
  progressTrack: document.querySelector('.progress-track'),
  resetProgress: document.querySelector('#resetProgress'),
  toast: document.querySelector('#toast')
};

let data;
let locations = [];
let locationById = new Map();
let mapController;
let progress = loadProgress();
let toastTimer;

const state = {
  mode: 'learn',
  region: 'world',
  category: 'all',
  selectedId: '',
  question: null,
  answered: false,
  previousQuestionId: '',
  reviewingIncorrect: false,
  reviewQueue: []
};

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function currentPool() {
  return locations.filter((location) => {
    const regionMatches = state.region === 'world' || location.region === state.region;
    const categoryMatches = state.category === 'all' || location.category === state.category;
    return regionMatches && categoryMatches;
  });
}

function visibleIdSet() {
  return new Set(currentPool().map((location) => location.id));
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
}

function renderRegions() {
  const regionOrder = ['world', 'europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania'];
  elements.regionList.replaceChildren(...regionOrder.map((regionId) => {
    const region = regionId === 'world'
      ? REGION_VIEWS.world
      : { ...REGION_VIEWS[regionId], ...data.regionMeta[regionId] };
    const count = regionId === 'world' ? locations.length : locations.filter((location) => location.region === regionId).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `region-button${state.region === regionId ? ' is-active' : ''}`;
    button.dataset.region = regionId;
    button.style.setProperty('--button-color', region.color);
    button.setAttribute('aria-pressed', String(state.region === regionId));
    button.innerHTML = `<span class="region-button__dot" aria-hidden="true"></span><span>${region.name}</span><span class="region-button__count">${count}</span>`;
    button.addEventListener('click', () => selectRegion(regionId));
    return button;
  }));
}

function renderCategories() {
  const categories = ['all', ...Object.keys(data.categoryMeta)];
  elements.categoryList.replaceChildren(...categories.map((category) => {
    const meta = category === 'all'
      ? { color: '#101426', symbol: '✦' }
      : data.categoryMeta[category];
    const count = category === 'all' ? locations.length : locations.filter((location) => location.category === category).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `category-button${state.category === category ? ' is-active' : ''}`;
    button.dataset.category = category;
    button.style.setProperty('--button-color', meta.color);
    button.setAttribute('aria-pressed', String(state.category === category));
    button.innerHTML = `<span class="category-button__icon" aria-hidden="true">${meta.symbol}</span><span>${category === 'all' ? 'Wszystkie' : category}</span><span class="category-button__count">${count}</span>`;
    button.addEventListener('click', () => selectCategory(category));
    return button;
  }));
}

function renderLegend() {
  elements.legend.replaceChildren(...Object.entries(data.categoryMeta).map(([name, meta]) => {
    const item = document.createElement('span');
    item.className = 'legend-item';
    item.style.setProperty('--legend-color', meta.color);
    item.innerHTML = `<span aria-hidden="true"></span>${name.replace(' / kanał', '')}`;
    return item;
  }));
}

function updateFilterUi({ focusMap = false } = {}) {
  renderRegions();
  renderCategories();
  const region = state.region === 'world'
    ? REGION_VIEWS.world
    : { ...REGION_VIEWS[state.region], ...data.regionMeta[state.region] };
  elements.currentRegionName.textContent = region.name;
  elements.contextDot.style.backgroundColor = region.color;
  elements.contextDot.style.boxShadow = `0 0 0 2px ${region.color}`;
  elements.visibleCount.textContent = String(currentPool().length);

  if (state.selectedId && !visibleIdSet().has(state.selectedId)) state.selectedId = '';
  mapController.updateMarkers(visibleIdSet(), state.selectedId, state.question?.target.id || '');

  if (focusMap) mapController.focusRegion(region);
  if (state.mode === 'quiz') startQuestion();
}

function selectRegion(regionId) {
  state.region = regionId;
  state.selectedId = '';
  closeMobileFilters();
  updateFilterUi({ focusMap: true });
  if (state.mode === 'learn') showWelcome();
}

function selectCategory(category) {
  state.category = category;
  state.selectedId = '';
  closeMobileFilters();
  updateFilterUi();
  if (state.mode === 'learn') showWelcome();
}

function showWelcome() {
  elements.welcomeCard.hidden = false;
  elements.placeCard.hidden = true;
  elements.quizCard.hidden = true;
}

function selectLocation(id, options = {}) {
  const location = locationById.get(id);
  if (!location) return;
  state.selectedId = id;
  elements.welcomeCard.hidden = true;
  elements.quizCard.hidden = true;
  elements.placeCard.hidden = false;

  const meta = data.categoryMeta[location.category];
  elements.placeCard.style.setProperty('--place-color', meta.color);
  elements.photoFallback.style.setProperty('--fallback-color', meta.color);
  elements.placeNumber.textContent = String(location.order).padStart(3, '0');
  elements.placeCategory.textContent = location.objectType;
  elements.placeRegion.textContent = location.regionName;
  elements.placeName.textContent = location.name;
  elements.placeCoordinates.textContent = formatCoordinates(location.latitude, location.longitude);
  elements.fallbackIcon.textContent = meta.symbol;
  elements.fallbackText.textContent = location.name;
  elements.factsList.replaceChildren(...location.facts.map((fact) => {
    const item = document.createElement('li');
    item.textContent = fact;
    return item;
  }));
  elements.sourceLink.href = location.source.url;
  elements.sourceLink.title = `Pokaż ${location.name} w Wikipedii`;

  elements.placeImage.hidden = true;
  elements.photoFallback.hidden = false;
  elements.placeImage.alt = location.image.alt;
  elements.placeImage.onload = () => {
    elements.placeImage.hidden = false;
    elements.photoFallback.hidden = true;
  };
  elements.placeImage.onerror = () => {
    elements.placeImage.hidden = true;
    elements.photoFallback.hidden = false;
  };
  elements.placeImage.src = location.image.url;

  const pool = currentPool();
  const index = pool.findIndex((item) => item.id === id);
  elements.placePosition.textContent = String(index + 1);
  elements.placeTotal.textContent = String(pool.length);
  mapController.updateMarkers(visibleIdSet(), id, '');
  if (options.focus !== false) mapController.focusLocation(location);

  if (window.innerWidth <= 720 && options.scroll !== false) {
    document.querySelector('#infoPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function navigatePlace(direction) {
  const pool = currentPool();
  if (!pool.length) return;
  const index = Math.max(0, pool.findIndex((location) => location.id === state.selectedId));
  const nextIndex = (index + direction + pool.length) % pool.length;
  selectLocation(pool[nextIndex].id, { scroll: false });
}

function renderSearchResults() {
  const query = normalize(elements.searchInput.value.trim());
  if (!query) {
    elements.searchResults.hidden = true;
    return;
  }
  const results = locations.filter((location) => {
    const haystack = normalize([location.name, location.shortName, ...location.aliases, location.objectType, location.category, location.regionName].join(' '));
    return haystack.includes(query);
  }).slice(0, 8);

  if (!results.length) {
    elements.searchResults.innerHTML = '<p class="search-result">Brak pasujących miejsc.</p>';
    elements.searchResults.hidden = false;
    return;
  }

  elements.searchResults.replaceChildren(...results.map((location) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result';
    button.style.setProperty('--result-color', data.categoryMeta[location.category].color);
    button.innerHTML = `<span aria-hidden="true"></span><div><strong>${location.name}</strong><small>${location.objectType} · ${location.regionName}</small></div>`;
    button.addEventListener('click', () => {
      state.region = location.region;
      state.category = 'all';
      elements.searchInput.value = '';
      elements.searchResults.hidden = true;
      updateFilterUi();
      setMode('learn');
      selectLocation(location.id);
      closeMobileFilters();
    });
    return button;
  }));
  elements.searchResults.hidden = false;
}

function setMode(mode) {
  if (mode !== 'quiz') {
    state.reviewingIncorrect = false;
    state.reviewQueue = [];
  }
  state.mode = mode;
  document.querySelectorAll('.mode-button').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (mode === 'quiz') {
    elements.welcomeCard.hidden = true;
    elements.placeCard.hidden = true;
    elements.quizCard.hidden = false;
    startQuestion();
  } else if (state.selectedId) {
    selectLocation(state.selectedId, { focus: false, scroll: false });
  } else {
    showWelcome();
    mapController.updateMarkers(visibleIdSet(), '', '');
  }
}

function startQuestion() {
  const correctionTargetId = state.reviewingIncorrect ? state.reviewQueue[0] : '';
  if (state.reviewingIncorrect && !correctionTargetId) {
    state.reviewingIncorrect = false;
  }

  const pool = state.reviewingIncorrect ? locations : currentPool();
  if (pool.length < 4) {
    elements.quizOptions.replaceChildren();
    elements.quizKicker.textContent = 'Za mało miejsc w tym filtrze';
    elements.quizFeedback.hidden = false;
    elements.quizFeedback.innerHTML = '<strong>Wybierz szerszy zakres</strong>Sprawdzian potrzebuje co najmniej czterech punktów.';
    elements.nextQuestion.hidden = true;
    state.question = null;
    mapController.updateMarkers(visibleIdSet(), '', '');
    return;
  }

  state.question = createQuestion(pool, state.previousQuestionId, correctionTargetId);
  if (!state.question && state.reviewingIncorrect) {
    state.reviewQueue.shift();
    startQuestion();
    return;
  }
  if (!state.question) return;
  state.previousQuestionId = state.question.target.id;
  state.answered = false;
  elements.quizKicker.textContent = state.reviewingIncorrect
    ? `POPRAWA · ${state.question.target.objectType} · ${state.question.target.regionName}`
    : `${state.question.target.objectType} · ${state.question.target.regionName}`;
  elements.quizFeedback.hidden = true;
  elements.nextQuestion.hidden = true;
  elements.nextQuestion.innerHTML = 'Następne pytanie <span aria-hidden="true">→</span>';
  elements.quizOptions.replaceChildren(...state.question.options.map((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-option';
    button.dataset.id = option.id;
    button.dataset.letter = String.fromCharCode(65 + index);
    button.textContent = option.name;
    button.addEventListener('click', () => answerQuestion(option.id));
    return button;
  }));
  const questionVisibility = state.reviewingIncorrect
    ? new Set(locations.map((location) => location.id))
    : visibleIdSet();
  mapController.updateMarkers(questionVisibility, '', state.question.target.id);
  mapController.focusLocation(state.question.target, 3.6);
}

function answerQuestion(selectedId) {
  if (!state.question || state.answered) return;
  state.answered = true;
  const targetId = state.question.target.id;
  const correct = selectedId === targetId;
  progress = recordAnswer(progress, targetId, selectedId);

  if (state.reviewingIncorrect) {
    state.reviewQueue = state.reviewQueue.filter((id) => id !== targetId);
    if (!correct) state.reviewQueue.push(targetId);
  }
  saveProgress(progress);

  elements.quizOptions.querySelectorAll('.quiz-option').forEach((button) => {
    button.disabled = true;
    if (button.dataset.id === state.question.target.id) button.classList.add('is-correct');
    if (!correct && button.dataset.id === selectedId) button.classList.add('is-wrong');
  });

  elements.quizFeedback.style.setProperty('--feedback-color', correct ? '#078e68' : '#db3556');
  const correctionSeriesFinished = state.reviewingIncorrect && correct && state.reviewQueue.length === 0;
  const allCorrected = correctionSeriesFinished && progress.incorrect.length === 0;
  const remainingCorrections = progress.incorrect.length;
  elements.quizFeedback.innerHTML = allCorrected
    ? '<strong>Wszystkie odpowiedzi poprawione!</strong>Twoja aktualna skuteczność wynosi 100%.'
    : correctionSeriesFinished
      ? `<strong>Odpowiedź poprawiona!</strong>Pozostało do poprawy: ${remainingCorrections}.`
      : `<strong>${correct ? 'Brawo! Dobra odpowiedź.' : `To ${state.question.target.name}.`}</strong>${state.question.target.facts[Math.floor(Math.random() * 3)]}`;
  elements.quizFeedback.hidden = false;
  elements.nextQuestion.hidden = false;
  elements.nextQuestion.innerHTML = correctionSeriesFinished
    ? 'Wróć do sprawdzianu <span aria-hidden="true">→</span>'
    : state.reviewingIncorrect
      ? 'Kolejna poprawa <span aria-hidden="true">→</span>'
      : 'Następne pytanie <span aria-hidden="true">→</span>';
  updateStats();
}

function startCorrections(targetId = '') {
  const availableIds = progress.incorrect
    .map((entry) => entry.targetId)
    .filter((id) => locationById.has(id));
  if (!availableIds.length) {
    showToast('Nie masz odpowiedzi do poprawy. Świetna robota!');
    return;
  }

  state.reviewingIncorrect = true;
  state.reviewQueue = targetId
    ? [targetId]
    : [...availableIds];
  startQuestion();
  if (window.innerWidth <= 720) elements.quizCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function advanceQuestion() {
  if (state.reviewingIncorrect && !state.reviewQueue.length) {
    state.reviewingIncorrect = false;
  }
  startQuestion();
}

function renderCorrections() {
  const entries = progress.incorrect
    .map((entry) => ({
      ...entry,
      target: locationById.get(entry.targetId),
      selected: locationById.get(entry.selectedId)
    }))
    .filter((entry) => entry.target);

  elements.incorrectCount.textContent = String(entries.length);
  elements.correctionsEmpty.hidden = entries.length > 0;
  elements.incorrectAnswers.hidden = entries.length === 0;
  elements.reviewIncorrect.hidden = entries.length === 0;
  elements.incorrectAnswers.replaceChildren(...entries.map((entry) => {
    const item = document.createElement('article');
    item.className = 'correction-item';

    const description = document.createElement('div');
    const meta = document.createElement('small');
    const name = document.createElement('strong');
    const selected = document.createElement('span');
    meta.textContent = `${entry.target.objectType} · ${entry.target.regionName}`;
    name.textContent = entry.target.name;
    selected.textContent = `Wybrano: ${entry.selected?.name || 'inna odpowiedź'}`;
    description.append(meta, name, selected);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Popraw';
    button.setAttribute('aria-label', `Popraw odpowiedź: ${entry.target.name}`);
    button.addEventListener('click', () => startCorrections(entry.targetId));
    item.append(description, button);
    return item;
  }));
}

function updateStats() {
  const percent = locations.length ? Math.round(progress.mastered.length / locations.length * 100) : 0;
  elements.headerScore.textContent = String(progress.mastered.length);
  elements.streakValue.textContent = String(progress.streak);
  elements.quizCorrect.textContent = String(progress.mastered.length);
  elements.quizAttempts.textContent = String(progress.incorrect.length);
  elements.quizAccuracy.textContent = `${accuracy(progress)}%`;
  elements.masteredCount.textContent = String(progress.mastered.length);
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressTrack.setAttribute('aria-valuenow', String(percent));
  renderCorrections();
}

function closeMobileFilters() {
  elements.sidebar.classList.remove('is-open');
}

function bindEvents() {
  document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  elements.searchInput.addEventListener('input', renderSearchResults);
  elements.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      elements.searchInput.value = '';
      elements.searchResults.hidden = true;
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-section')) elements.searchResults.hidden = true;
  });
  elements.previousPlace.addEventListener('click', () => navigatePlace(-1));
  elements.nextPlace.addEventListener('click', () => navigatePlace(1));
  elements.nextQuestion.addEventListener('click', advanceQuestion);
  elements.reviewIncorrect.addEventListener('click', () => startCorrections());
  elements.zoomIn.addEventListener('click', () => mapController.zoomBy(0.45));
  elements.zoomOut.addEventListener('click', () => mapController.zoomBy(-0.45));
  elements.resetMap.addEventListener('click', () => mapController.focusRegion(REGION_VIEWS[state.region]));
  elements.openFilters.addEventListener('click', () => elements.sidebar.classList.add('is-open'));
  elements.closeFilters.addEventListener('click', closeMobileFilters);
  elements.resetProgress.addEventListener('click', () => {
    progress = clearProgress();
    state.reviewingIncorrect = false;
    state.reviewQueue = [];
    updateStats();
    showToast('Postęp został wyzerowany. Możesz zacząć od nowa!');
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input')) return;
    if (state.mode === 'learn' && event.key === 'ArrowRight') navigatePlace(1);
    if (state.mode === 'learn' && event.key === 'ArrowLeft') navigatePlace(-1);
    if (state.mode === 'quiz' && !state.answered && ['1', '2', '3', '4'].includes(event.key)) {
      const option = state.question?.options[Number(event.key) - 1];
      if (option) answerQuestion(option.id);
    }
  });
}

async function initialize() {
  try {
    const response = await fetch('src/data/locations.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    locations = data.locations;
    locationById = new Map(locations.map((location) => [location.id, location]));
    const knownIds = new Set(locationById.keys());
    progress.mastered = [...new Set(progress.mastered.filter((id) => knownIds.has(id)))];
    progress.incorrect = progress.incorrect
      .filter((entry, index, items) => knownIds.has(entry.targetId)
        && knownIds.has(entry.selectedId)
        && entry.targetId !== entry.selectedId
        && items.findLastIndex((candidate) => candidate.targetId === entry.targetId) === index);
    const incorrectIds = new Set(progress.incorrect.map((entry) => entry.targetId));
    progress.mastered = progress.mastered.filter((id) => !incorrectIds.has(id));
    saveProgress(progress);

    for (const [category, meta] of Object.entries(data.categoryMeta)) {
      meta.shape = CATEGORY_SHAPES[category] || 'circle';
    }

    mapController = createMapController({
      viewport: elements.map,
      world: elements.mapWorld,
      markerLayer: elements.markerLayer,
      locations,
      categoryMeta: data.categoryMeta,
      onSelect: (id) => {
        if (state.mode === 'quiz') return;
        selectLocation(id);
      }
    });

    elements.totalLocations.textContent = String(locations.length);
    renderLegend();
    renderRegions();
    renderCategories();
    bindEvents();
    updateStats();
    updateFilterUi();
  } catch (error) {
    console.error(error);
    elements.welcomeCard.innerHTML = '<p class="eyebrow">BŁĄD DANYCH</p><h1>Mapa nie mogła wystartować.</h1><p>Uruchom aplikację przez <code>npm start</code>, a nie bezpośrednio z pliku HTML.</p>';
  }
}

initialize();