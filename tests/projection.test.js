import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCoordinates, projectCoordinates } from '../src/data/projection.js';

test('równik i południk zerowy trafiają w skalibrowany środek siatki mapy', () => {
  const point = projectCoordinates(0, 0);
  assert.ok(Math.abs(point.x - 46.97) < 0.1);
  assert.ok(Math.abs(point.y - 66.36) < 0.1);
});

test('skrajne miejsca z katalogu pozostają na rastrze', () => {
  const points = [
    projectCoordinates(78, 18),
    projectCoordinates(-54, -69),
    projectCoordinates(52, -170),
    projectCoordinates(-41, 174)
  ];
  for (const point of points) {
    assert.ok(point.x >= 0 && point.x <= 100, `X poza mapą: ${point.x}`);
    assert.ok(point.y >= 0 && point.y <= 100, `Y poza mapą: ${point.y}`);
  }
});

test('formatowanie współrzędnych używa kierunków N/S/E/W', () => {
  assert.equal(formatCoordinates(53.5, 108), '53.5° N  ·  108.0° E');
  assert.equal(formatCoordinates(-15.8, -69.4), '15.8° S  ·  69.4° W');
});