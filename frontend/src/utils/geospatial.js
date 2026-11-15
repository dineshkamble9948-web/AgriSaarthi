const EARTH_RADIUS_METERS = 6_371_000;

export function calculatePolygonAreaSquareMeters(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return 0;
  }

  const meanLatitude = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const longitudeScale = Math.cos((meanLatitude * Math.PI) / 180);
  const projectedPoints = points.map(([latitude, longitude]) => [
    EARTH_RADIUS_METERS * ((longitude * Math.PI) / 180) * longitudeScale,
    EARTH_RADIUS_METERS * ((latitude * Math.PI) / 180)
  ]);
  let twiceArea = 0;

  for (let index = 0; index < projectedPoints.length; index += 1) {
    const [x1, y1] = projectedPoints[index];
    const [x2, y2] = projectedPoints[(index + 1) % projectedPoints.length];
    twiceArea += x1 * y2 - x2 * y1;
  }

  return Math.abs(twiceArea) / 2;
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
