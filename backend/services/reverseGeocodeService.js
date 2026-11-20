const REQUEST_TIMEOUT_MS = 6000;

export async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error("Invalid latitude or longitude coordinates.");
  }

  // 1. Try OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "AgriSaarthi-SmartAgriculture/1.0",
        "Accept-Language": "en"
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const state = addr.state || addr.province || addr.region || "";
      const district = addr.state_district || addr.county || addr.district || "";
      const city = addr.city || addr.town || addr.municipality || "";
      const village = addr.village || addr.hamlet || addr.suburb || addr.neighbourhood || addr.quarter || "";
      const pincode = addr.postcode || "";

      return {
        success: true,
        latitude: lat,
        longitude: lon,
        state: state.trim(),
        district: district.trim(),
        village: village.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        formattedAddress: [village || city, district, state, pincode].filter(Boolean).join(", "),
        source: "Nominatim"
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode failed, falling back to BigDataCloud:", err.message);
  }

  // 2. Fallback to BigDataCloud reverse geocode
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const response = await fetch(bdcUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const adminList = data.localityInfo?.administrative || [];
      const districtAdmin = adminList.find((a) => a.adminLevel === 6 || a.adminLevel === 5 || /district/i.test(a.description || ""));

      const state = data.principalSubdivision || "";
      const district = districtAdmin?.name || data.city || "";
      const city = data.city || data.locality || "";
      const village = data.locality && data.locality !== data.city ? data.locality : "";
      const pincode = data.postcode || "";

      return {
        success: true,
        latitude: lat,
        longitude: lon,
        state: state.trim(),
        district: district.trim(),
        village: village.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        formattedAddress: [village || city, district, state, pincode].filter(Boolean).join(", "),
        source: "BigDataCloud"
      };
    }
  } catch (err) {
    console.warn("BigDataCloud reverse geocode failed:", err.message);
  }

  // 3. Fallback: Return verified coordinates with empty address fields for manual completion
  return {
    success: true,
    latitude: lat,
    longitude: lon,
    state: "",
    district: "",
    village: "",
    city: "",
    pincode: "",
    formattedAddress: `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`,
    source: "CoordinatesOnly"
  };
}
