import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../src/data/locations.json', import.meta.url), 'utf8'));

test('katalog zawiera 197 miejsc i 591 ciekawostek', () => {
  assert.equal(data.locations.length, 197);
  assert.equal(data.locations.flatMap((location) => location.facts).length, 591);
});

test('każde miejsce ma unikalny identyfikator i komplet metadanych', () => {
  const ids = new Set();
  const validRegions = new Set(Object.keys(data.regionMeta));
  const validCategories = new Set(Object.keys(data.categoryMeta));

  for (const location of data.locations) {
    assert.ok(location.id);
    assert.ok(!ids.has(location.id), `Powtórzony identyfikator: ${location.id}`);
    ids.add(location.id);
    assert.ok(validRegions.has(location.region), `Nieznany region: ${location.region}`);
    assert.ok(validCategories.has(location.category), `Nieznana kategoria: ${location.category}`);
    assert.equal(typeof location.name, 'string');
    assert.ok(location.name.length >= 2);
    assert.ok(location.latitude >= -90 && location.latitude <= 90);
    assert.ok(location.longitude >= -180 && location.longitude <= 180);
    assert.ok(location.source.title);
    assert.match(location.source.url, /^https:\/\/pl\.wikipedia\.org\/wiki\//);
    assert.match(location.image.url, /^https:\/\//);
    assert.ok(location.image.alt.includes(location.name));
    assert.ok(location.image.sourceTitle);
    assert.match(location.image.sourceUrl, /^https:\/\/pl\.wikipedia\.org\/wiki\//);
  }
});

test('każde miejsce ma dokładnie trzy krótkie, pełne ciekawostki', () => {
  const forbiddenPhrases = ['Na mapie szukaj', 'Współrzędne punktu', 'południka Greenwich'];
  const foreignScript = /[\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\u0f00-\u0fff\u4e00-\u9fff]/;
  const foreignAbbreviation = /\b(?:ang|fr|niem|ros|hiszp|port|wł|łac|gr|duń|szw|norw|arab|pers|chin|jap|wietn|taj|tybet|urdu|maled|azer|kaz|turkm|wym|trl)\./i;

  for (const location of data.locations) {
    assert.equal(location.facts.length, 3, `${location.name} nie ma trzech ciekawostek`);
    const uniqueFacts = new Set(location.facts.map((fact) => fact.toLocaleLowerCase('pl-PL')));
    assert.equal(uniqueFacts.size, 3, `${location.name} ma powtórzone ciekawostki`);

    for (const fact of location.facts) {
      assert.ok(fact.length >= 35, `Za krótka ciekawostka (${location.name}): ${fact}`);
      assert.ok(fact.length <= 180, `Za długa ciekawostka (${location.name}): ${fact}`);
      assert.match(fact, /[.!?]$/, `Brak kropki końcowej (${location.name}): ${fact}`);
      assert.ok(!fact.includes('…'), `Urwana ciekawostka (${location.name}): ${fact}`);
      assert.ok(!foreignScript.test(fact), `Obcy alfabet (${location.name}): ${fact}`);
      assert.ok(!foreignAbbreviation.test(fact), `Resztka transliteracji (${location.name}): ${fact}`);
      for (const phrase of forbiddenPhrases) {
        assert.ok(!fact.includes(phrase), `Tekst techniczny (${location.name}): ${fact}`);
      }
    }
  }
});

test('liczba miejsc w regionach odpowiada materiałowi źródłowemu', () => {
  const counts = Object.fromEntries(Object.keys(data.regionMeta).map((region) => [
    region,
    data.locations.filter((location) => location.region === region).length
  ]));
  assert.deepEqual(counts, {
    europe: 68,
    asia: 49,
    africa: 21,
    'north-america': 33,
    'south-america': 11,
    oceania: 15
  });
});

test('powtórzone fakty dotyczą wyłącznie obiektów świadomie obecnych w dwóch regionach', () => {
  const owners = new Map();
  for (const location of data.locations) {
    for (const fact of location.facts) {
      const key = fact.toLocaleLowerCase('pl-PL');
      owners.set(key, [...(owners.get(key) || []), location.source.title]);
    }
  }
  const duplicates = [...owners.values()].filter((items) => items.length > 1);
  const allowed = new Set(['Morze Kaspijskie', 'Morze Beringa', 'Cieśnina Beringa']);
  assert.ok(duplicates.length > 0);
  for (const titles of duplicates) {
    assert.equal(new Set(titles).size, 1);
    assert.ok(allowed.has(titles[0]), `Nieoczekiwany duplikat dla ${titles[0]}`);
  }
});