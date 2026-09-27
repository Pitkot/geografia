import test from 'node:test';
import assert from 'node:assert/strict';
import { pinchView, zoomViewAtPoint } from '../src/ui/map.js';

test('zoom względem punktu zachowuje wskazany fragment mapy pod kursorem', () => {
  const start = { zoom: 2, panX: 40, panY: -20 };
  const focal = { x: 120, y: 60 };
  const before = {
    x: (focal.x - start.panX) / start.zoom,
    y: (focal.y - start.panY) / start.zoom
  };
  const result = zoomViewAtPoint(start, 4, focal);
  assert.equal((focal.x - result.panX) / result.zoom, before.x);
  assert.equal((focal.y - result.panY) / result.zoom, before.y);
});

test('gest dwóch palców jednocześnie powiększa i przesuwa mapę', () => {
  const start = { zoom: 2, panX: 30, panY: -10 };
  const startCenter = { x: 50, y: 20 };
  const currentCenter = { x: 80, y: 45 };
  const result = pinchView(start, startCenter, 100, currentCenter, 150);
  assert.equal(result.zoom, 3);
  assert.equal(result.panX, 50);
  assert.equal(result.panY, 0);
});

test('powiększenie mapy pozostaje w zakresie od 1 do 6', () => {
  assert.deepEqual(zoomViewAtPoint({ zoom: 2, panX: 10, panY: 10 }, -5), { zoom: 1, panX: 0, panY: 0 });
  assert.equal(zoomViewAtPoint({ zoom: 5, panX: 0, panY: 0 }, 9).zoom, 6);
  assert.equal(pinchView({ zoom: 4, panX: 0, panY: 0 }, { x: 0, y: 0 }, 10, { x: 0, y: 0 }, 50).zoom, 6);
});