import { projectCoordinates } from '../data/projection.js';

export function createMapController({ viewport, world, markerLayer, locations, categoryMeta, onSelect }) {
  const markers = new Map();
  let view = { zoom: 1, panX: 0, panY: 0 };
  let dragStart = null;

  const fragment = document.createDocumentFragment();
  locations.forEach((location) => {
    const point = projectCoordinates(location.latitude, location.longitude);
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = `map-marker shape-${categoryMeta[location.category].shape}`;
    marker.dataset.id = location.id;
    marker.style.left = `${point.x}%`;
    marker.style.top = `${point.y}%`;
    marker.style.setProperty('--marker-color', categoryMeta[location.category].color);
    marker.setAttribute('aria-label', `${location.name}, ${location.category}`);
    marker.innerHTML = `<span class="marker-pulse"></span><span class="marker-symbol" aria-hidden="true">${categoryMeta[location.category].symbol}</span><span class="marker-label">${location.name}</span>`;
    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      onSelect(location.id);
    });
    markers.set(location.id, marker);
    fragment.append(marker);
  });
  markerLayer.append(fragment);

  function applyView(animate = true) {
    world.classList.toggle('no-transition', !animate);
    world.style.setProperty('--marker-scale', String(1 / view.zoom));
    world.style.transform = `translate3d(calc(-50% + ${view.panX}px), calc(-50% + ${view.panY}px), 0) scale(${view.zoom})`;
    if (!animate) requestAnimationFrame(() => world.classList.remove('no-transition'));
  }

  function focusCoordinates(latitude, longitude, zoom = 3.3) {
    const point = projectCoordinates(latitude, longitude);
    const worldRect = world.getBoundingClientRect();
    const baseWidth = worldRect.width / view.zoom;
    const baseHeight = worldRect.height / view.zoom;
    view.zoom = zoom;
    view.panX = (50 - point.x) / 100 * baseWidth * zoom;
    view.panY = (50 - point.y) / 100 * baseHeight * zoom;
    applyView();
  }

  function focusLocation(location, zoom = 3.3) {
    focusCoordinates(location.latitude, location.longitude, zoom);
  }

  function focusRegion(region) {
    if (!region || region.id === 'world') {
      reset();
      return;
    }
    focusCoordinates(region.latitude, region.longitude, region.zoom);
  }

  function zoomBy(delta) {
    const previousZoom = view.zoom;
    view.zoom = Math.max(1, Math.min(6, view.zoom + delta));
    if (view.zoom === 1) {
      view.panX = 0;
      view.panY = 0;
    } else if (previousZoom > 0) {
      const ratio = view.zoom / previousZoom;
      view.panX *= ratio;
      view.panY *= ratio;
    }
    applyView();
  }

  function reset() {
    view = { zoom: 1, panX: 0, panY: 0 };
    applyView();
  }

  function updateMarkers(visibleIds, selectedId, quizTargetId = '') {
    markers.forEach((marker, id) => {
      const visible = visibleIds.has(id);
      marker.hidden = !visible;
      marker.classList.toggle('is-selected', id === selectedId);
      marker.classList.toggle('is-quiz-target', id === quizTargetId);
      marker.tabIndex = visible ? 0 : -1;
    });
  }

  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 0.35 : -0.35);
  }, { passive: false });

  viewport.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.map-marker, .map-controls, .legend')) return;
    dragStart = { x: event.clientX, y: event.clientY, panX: view.panX, panY: view.panY };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!dragStart) return;
    view.panX = dragStart.panX + event.clientX - dragStart.x;
    view.panY = dragStart.panY + event.clientY - dragStart.y;
    applyView(false);
  });

  function stopDragging() {
    dragStart = null;
    viewport.classList.remove('is-dragging');
  }
  viewport.addEventListener('pointerup', stopDragging);
  viewport.addEventListener('pointercancel', stopDragging);

  return { focusLocation, focusRegion, zoomBy, reset, updateMarkers };
}