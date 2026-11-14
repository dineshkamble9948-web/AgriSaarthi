export default function formatWeatherTime(date, offsetSeconds = 0, options = {}) {
  if (!date) {
    return "Unavailable";
  }

  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Unavailable";
  }

  const offset = Number.isFinite(offsetSeconds) ? offsetSeconds : 0;
  return new Intl.DateTimeFormat(undefined, {
    ...options,
    timeZone: "UTC"
  }).format(new Date(timestamp + offset * 1000));
}
