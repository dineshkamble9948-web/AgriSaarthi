const EARTH_RADIUS_METERS = 6_371_000;

export class FarmInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "FarmInputError";
    this.statusCode = 400;
  }
}

export function normalizeFarmCoordinates(latitude, longitude) {
  const hasLatitude = latitude !== undefined && latitude !== null && latitude !== "";
  const hasLongitude = longitude !== undefined && longitude !== null && longitude !== "";

  if (hasLatitude !== hasLongitude) {
    throw new FarmInputError("Latitude and longitude must be provided together.");
  }

  if (!hasLatitude) {
    return { latitude: null, longitude: null };
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (
    !Number.isFinite(parsedLatitude)
    || parsedLatitude < -90
    || parsedLatitude > 90
    || !Number.isFinite(parsedLongitude)
    || parsedLongitude < -180
    || parsedLongitude > 180
  ) {
    throw new FarmInputError("Latitude must be between -90 and 90 and longitude between -180 and 180.");
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

export function normalizeFarmBoundary(boundary) {
  if (!boundary || boundary.type !== "Polygon" || !Array.isArray(boundary.coordinates?.[0])) {
    throw new FarmInputError("Farm boundary must be a GeoJSON Polygon.");
  }

  const ring = boundary.coordinates[0].map((position) => {
    if (!Array.isArray(position) || position.length < 2) {
      throw new FarmInputError("Farm boundary contains an invalid coordinate.");
    }

    const longitude = Number(position[0]);
    const latitude = Number(position[1]);
    if (
      !Number.isFinite(longitude)
      || longitude < -180
      || longitude > 180
      || !Number.isFinite(latitude)
      || latitude < -90
      || latitude > 90
    ) {
      throw new FarmInputError("Farm boundary coordinates are outside valid latitude/longitude ranges.");
    }

    return [longitude, latitude];
  });

  const firstPosition = ring[0];
  const lastPosition = ring[ring.length - 1];
  if (
    ring.length > 1
    && firstPosition[0] === lastPosition[0]
    && firstPosition[1] === lastPosition[1]
  ) {
    ring.pop();
  }

  const uniquePositions = new Set(ring.map(([longitude, latitude]) => `${longitude},${latitude}`));
  if (uniquePositions.size < 3) {
    throw new FarmInputError("Farm boundary must contain at least three distinct points.");
  }

  ring.push([...ring[0]]);
  const normalized = { type: "Polygon", coordinates: [ring] };
  if (calculateFarmBoundaryAreaSquareMeters(normalized) <= 0) {
    throw new FarmInputError("Farm boundary must enclose a measurable area.");
  }

  return normalized;
}

export function calculateFarmBoundaryAreaSquareMeters(boundary) {
  const ring = boundary?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return 0;
  }

  const openRing = ring.slice(0, -1);
  const meanLatitude = openRing.reduce((sum, position) => sum + position[1], 0) / openRing.length;
  const longitudeScale = Math.cos((meanLatitude * Math.PI) / 180);
  const projected = openRing.map(([longitude, latitude]) => [
    EARTH_RADIUS_METERS * ((longitude * Math.PI) / 180) * longitudeScale,
    EARTH_RADIUS_METERS * ((latitude * Math.PI) / 180)
  ]);
  let twiceArea = 0;

  for (let index = 0; index < projected.length; index += 1) {
    const [x1, y1] = projected[index];
    const [x2, y2] = projected[(index + 1) % projected.length];
    twiceArea += x1 * y2 - x2 * y1;
  }

  return Math.abs(twiceArea) / 2;
}
