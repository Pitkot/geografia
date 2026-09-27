import { projectCoordinates } from '../data/projection.js';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

function clampZoom(zoom) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

export function zoomViewAtPoint(view, requestedZoom, focalOffset = { x: 0, y: 0 }) {
  const zoom = clampZoom(requestedZoom);
  if (zoom === MIN_ZOOM) return { zoom, panX: 0, panY: 0 };
  const ratio = zoom / view.zoom;
  return {
    zoom,
    panX: focalOffset.x + (view.panX - focalOffset.x) * ratio,
    panY: focalOffset.y + (view.panY - focalOffset.y) * ratio
  };
}

export function pinchView(startView, startCenter, startDistance, currentCenter, currentDistance) {
  if (!startDistance || !currentDistance) return { ...startView };
  const zoom = clampZoom(startView.zoom * currentDistance / startDistance);
  if (zoom === MIN_ZOOM) return { zoom, panX: 0, panY: 0 };
  const mapPointX = (startCenter.x - startView.panX) / startView.zoom;
  const mapPointY = (startCenter.y - startView.panY) / startView.zoom;
  return {
    zoom,
    panX: currentCenter.x - mapPointX * zoom,
    panY: currentCenter.y - mapPointY * zoom
  };
}

function distanceBetween(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function centerBetween(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

export function createMapController({ viewport, world, markerLayer, locations, categoryMeta, onSelect }) {
  const markers = new Map();
  let view = { zoom: 1, panX: 0, panY: 0 };
  const pointers = new Map();
  let gesture = null;
  let suppressNextClick = false;

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
    marker.setAttribute('aria-label', `${location.name}, ${location.objectType}`);
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

  function viewportOffset(point) {
    const rect = viewport.getBoundingClientRect();
    return {
      x: point.x - (rect.left + rect.width / 2),
      y: point.y - (rect.top + rect.height / 2)
    };
  }

  function zoomBy(delta, focalPoint = null, animate = true) {
    const focalOffset = focalPoint ? viewportOffset(focalPoint) : { x: 0, y: 0 };
    view = zoomViewAtPoint(view, view.zoom + delta, focalOffset);
    applyView(animate);
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
    zoomBy(event.deltaY < 0 ? 0.35 : -0.35, { x: event.clientX, y: event.clientY }, false);
  }, { passive: false });

  function beginPan(pointer, moved = false) {
    gesture = {
      type: 'pan',
      pointerId: pointer.id,
      startPoint: { x: pointer.x, y: pointer.y },
      startView: { ...view },
      moved
    };
  }

  function capturePointer(pointerId) {
    const pointer = pointers.get(pointerId);
    if (!pointer || pointer.captured) return;
    try {
      viewport.setPointerCapture(pointerId);
      pointer.captured = true;
    } catch {
      // Wskaźnik mógł zostać anulowany przez przeglądarkę przed przechwyceniem.
    }
  }

  function beginPinch() {
    const [first, second] = [...pointers.values()].slice(0, 2);
    if (!first || !second) return;
    capturePointer(first.id);
    capturePointer(second.id);
    gesture = {
      type: 'pinch',
      startCenter: viewportOffset(centerBetween(first, second)),
      startDistance: distanceBetween(first, second),
      startView: { ...view },
      moved: true
    };
  }

  viewport.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.map-controls, .legend')) return;
    const startsOnMarker = Boolean(event.target.closest('.map-marker'));
    pointers.set(event.pointerId, {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      captured: false
    });
    if (!startsOnMarker) capturePointer(event.pointerId);
    viewport.classList.add('is-dragging');
    if (pointers.size === 1) beginPan(pointers.get(event.pointerId));
    if (pointers.size >= 2) beginPinch();
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      if (gesture?.type !== 'pinch') beginPinch();
      const [first, second] = [...pointers.values()].slice(0, 2);
      view = pinchView(
        gesture.startView,
        gesture.startCenter,
        gesture.startDistance,
        viewportOffset(centerBetween(first, second)),
        distanceBetween(first, second)
      );
      gesture.moved = true;
      applyView(false);
      return;
    }

    if (gesture?.type !== 'pan' || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startPoint.x;
    const deltaY = event.clientY - gesture.startPoint.y;
    if (!gesture.moved && Math.hypot(deltaX, deltaY) < 4) return;
    gesture.moved = true;
    capturePointer(event.pointerId);
    view.panX = gesture.startView.panX + deltaX;
    view.panY = gesture.startView.panY + deltaY;
    applyView(false);
  });

  function finishPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const moved = Boolean(gesture?.moved);
    pointers.delete(event.pointerId);

    if (moved) {
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 0);
    }

    if (pointers.size >= 2) {
      beginPinch();
    } else if (pointers.size === 1) {
      beginPan([...pointers.values()][0], moved);
    } else {
      gesture = null;
      viewport.classList.remove('is-dragging');
    }
  }

  viewport.addEventListener('pointerup', finishPointer);
  viewport.addEventListener('pointercancel', finishPointer);
  viewport.addEventListener('click', (event) => {
    if (!suppressNextClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressNextClick = false;
  }, true);

  return { focusLocation, focusRegion, zoomBy, reset, updateMarkers };
}