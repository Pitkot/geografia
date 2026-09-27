const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1394;
const EQUATOR_X = 962;
const EQUATOR_Y = 925;
const X_SCALE = 5.625;
const MERCATOR_SCALE = 320;

export function projectCoordinates(latitude, longitude) {
  const safeLatitude = Math.max(-75, Math.min(82, latitude));
  const latitudeRadians = safeLatitude * Math.PI / 180;
  const x = EQUATOR_X + X_SCALE * longitude;
  const y = EQUATOR_Y - MERCATOR_SCALE * Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2));
  return {
    x: x / MAP_WIDTH * 100,
    y: y / MAP_HEIGHT * 100
  };
}

export function formatCoordinates(latitude, longitude) {
  const latDirection = latitude >= 0 ? 'N' : 'S';
  const lonDirection = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(1)}° ${latDirection}  ·  ${Math.abs(longitude).toFixed(1)}° ${lonDirection}`;
}