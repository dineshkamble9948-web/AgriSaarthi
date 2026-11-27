const WGS84_RADIUS_METERS = 6378137;
const SQUARE_METERS_PER_ACRE = 4046.8564224;
const SQUARE_METERS_PER_HECTARE = 10000;

/**
 * Calculates geodesic polygon area on the WGS-84 sphere (accurate to standard GIS/Turf.js)
 * @param {Array<[number, number]>} points Array of [lat, lng] coordinates
 * @returns {number} Area in square meters
 */
export function calculatePolygonAreaSquareMeters(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return 0;
  }

  // Ensure ring closes
  const ring = points.map(([lat, lng]) => [
    (lat * Math.PI) / 180,
    (lng * Math.PI) / 180
  ]);
  const n = ring.length;
  let totalAngle = 0;

  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n];
    const next = ring[(i + 1) % n];
    totalAngle += (next[1] - prev[1]) * Math.sin(ring[i][0]);
  }

  const areaSqMeters = Math.abs((totalAngle * WGS84_RADIUS_METERS * WGS84_RADIUS_METERS) / 2);
  return Number.isFinite(areaSqMeters) ? areaSqMeters : 0;
}

/**
 * Returns formatted land area in acres and hectares
 */
export function calculateLandArea(points) {
  const sqMeters = calculatePolygonAreaSquareMeters(points);
  const acres = sqMeters / SQUARE_METERS_PER_ACRE;
  const hectares = sqMeters / SQUARE_METERS_PER_HECTARE;

  return {
    squareMeters: Math.round(sqMeters),
    acres: +acres.toFixed(2),
    hectares: +hectares.toFixed(2),
    formattedAcres: `${acres.toFixed(2)} acres`,
    formattedHectares: `${hectares.toFixed(2)} ha`
  };
}

export function polygonPathToGeoJSON(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return null;
  }

  const ring = points.map(([latitude, longitude]) => [longitude, latitude]);
  const firstPoint = ring[0];
  const lastPoint = ring[ring.length - 1];

  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    ring.push([...firstPoint]);
  }

  return {
    type: "Polygon",
    coordinates: [ring]
  };
}

export function geoJSONToPolygonPath(boundary) {
  const ring = boundary?.type === "Polygon" ? boundary.coordinates?.[0] : null;

  if (!Array.isArray(ring)) {
    return [];
  }

  const path = ring.map(([longitude, latitude]) => [latitude, longitude]);
  const firstPoint = path[0];
  const lastPoint = path[path.length - 1];

  if (
    path.length > 1
    && firstPoint[0] === lastPoint[0]
    && firstPoint[1] === lastPoint[1]
  ) {
    path.pop();
  }

  return path;
}
