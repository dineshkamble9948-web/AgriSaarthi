
import { useMemo, useState } from "react";
import { Sprout, MapPin, Ruler, Droplets, LocateFixed, Undo2, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../services/api";
import FarmLocationMap from "../components/FarmLocationMap";
import {
  calculatePolygonAreaSquareMeters,
  geoJSONToPolygonPath,
  polygonPathToGeoJSON
} from "../utils/geospatial";

const SQUARE_METERS_PER_ACRE = 4046.8564224;
const SQUARE_METERS_PER_HECTARE = 10000;

export default function FarmSetup({
  onFarmSaved,
  existingFarm = null,
  userLocation = null,
  createNewFarm = false,
  embedded = false,
  onCancel
}) {
  const [form, setForm] = useState(() => ({
    farmName: existingFarm?.farmName || "",
    location: existingFarm?.location || userLocation?.village || userLocation?.city || "",
    state: existingFarm?.state || userLocation?.state || "Karnataka",
    district: existingFarm?.district || userLocation?.district || "",
    village: existingFarm?.village || userLocation?.village || "",
    city: existingFarm?.city || userLocation?.city || "",
    pincode: existingFarm?.pincode || userLocation?.pincode || "",
    area: existingFarm?.area == null ? "" : String(existingFarm.area),
    areaUnit: existingFarm?.areaUnit || "acres",
    soilType: existingFarm?.soilType || "Red",
    ph: existingFarm?.ph == null ? "" : String(existingFarm.ph),
    nitrogen: existingFarm?.nitrogen == null ? "" : String(existingFarm.nitrogen),
    phosphorus: existingFarm?.phosphorus == null ? "" : String(existingFarm.phosphorus),
    potassium: existingFarm?.potassium == null ? "" : String(existingFarm.potassium),
    waterSource: existingFarm?.waterSource || "Borewell",
    irrigationType: existingFarm?.irrigationType || "Unknown",
    latitude: existingFarm?.latitude != null ? String(existingFarm.latitude) : (userLocation?.latitude != null ? String(userLocation.latitude) : ""),
    longitude: existingFarm?.longitude != null ? String(existingFarm.longitude) : (userLocation?.longitude != null ? String(userLocation.longitude) : "")
  }));

  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState("");
  const [detectedAddress, setDetectedAddress] = useState("");
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [boundaryPoints, setBoundaryPoints] = useState(
    () => geoJSONToPolygonPath(existingFarm?.boundary)
  );
  const [drawingBoundary, setDrawingBoundary] = useState(false);
  const areaSquareMeters = useMemo(
    () => calculatePolygonAreaSquareMeters(boundaryPoints),
    [boundaryPoints]
  );

  const updateCenter = ([latitude, longitude]) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6)
    }));
    setLocationError("");
  };

  const areaFromBoundary = (squareMeters, unit) => {
    const divisor = unit === "hectares" ? SQUARE_METERS_PER_HECTARE : SQUARE_METERS_PER_ACRE;
    return squareMeters > 0 ? (squareMeters / divisor).toFixed(2) : "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: name === "areaUnit" && areaSquareMeters >= 0.01
        ? areaFromBoundary(areaSquareMeters, value)
        : value
    }));
  };

  const detectCurrentLocation = () => {
    setLocationError("");
    setLocationSuccess("");
    setDetectedAddress("");

    if (!navigator.geolocation) {
      setLocationError("GPS location access is not supported by your browser. Please enter your location manually below.");
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lon = coords.longitude;

        try {
          const { data } = await api.get("/farms/reverse-geocode", {
            params: { latitude: lat, longitude: lon }
          });

          setForm((prev) => ({
            ...prev,
            state: data.state || prev.state,
            district: data.district || prev.district,
            village: data.village || prev.village,
            city: data.city || prev.city,
            pincode: data.pincode || prev.pincode,
            location: data.village || data.city || data.district || prev.location || "Farm Location",
            latitude: Number(lat).toFixed(6),
            longitude: Number(lon).toFixed(6)
          }));

          const addressSummary =
            data.formattedAddress ||
            [data.village, data.city, data.district, data.state, data.pincode].filter(Boolean).join(", ");
          setDetectedAddress(addressSummary);

          // Automatically save location to user profile in MongoDB
          try {
            await api.post("/auth/location", {
              state: data.state || form.state,
              district: data.district || form.district,
              village: data.village || form.village,
              city: data.city || form.city,
              pincode: data.pincode || form.pincode,
              latitude: lat,
              longitude: lon
            });
          } catch (saveErr) {
            console.warn("Auto-save user profile location warning:", saveErr?.message);
          }

          setLocationSuccess("Your location has been detected and saved successfully!");
        } catch (apiErr) {
          // If reverse geocoding request fails, still save coordinates
          setForm((prev) => ({
            ...prev,
            latitude: Number(lat).toFixed(6),
            longitude: Number(lon).toFixed(6)
          }));
          setLocationError(
            apiErr.response?.data?.message ||
            "Retrieved GPS coordinates, but could not resolve address details. Please fill in state/district manually."
          );
        } finally {
          setDetectingLocation(false);
        }
      },
      (geoError) => {
        setDetectingLocation(false);
        let msg = "Could not detect your current location. Please enter your location details manually.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = "Location permission was denied. Please allow location access in your browser settings, or enter your location manually below.";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          msg = "GPS signal or location provider unavailable. Please enter your location manually.";
        } else if (geoError.code === geoError.TIMEOUT) {
          msg = "Location detection timed out. Please try again or enter your location manually.";
        }
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleMapClick = (position) => {
    if (drawingBoundary) {
      setBoundaryPoints((points) => [...points, position]);
      if (!form.latitude || !form.longitude) {
        updateCenter(position);
      }
      return;
    }

    updateCenter(position);
  };

  const handleCoordinateChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setLocationError("");
  };

  const finishBoundary = () => {
    if (boundaryPoints.length < 3) {
      setError("Mark at least three points on the map to define a farm boundary.");
      return;
    }

    setDrawingBoundary(false);
    setError("");
    setForm((current) => ({
      ...current,
      area: areaFromBoundary(areaSquareMeters, current.areaUnit)
    }));
  };

  const clearBoundary = () => {
    setBoundaryPoints([]);
    setDrawingBoundary(false);
    setForm((current) => ({
      ...current,
      area: areaSquareMeters > 0 ? "" : current.area
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    const latitude = form.latitude === "" ? null : Number(form.latitude);
    const longitude = form.longitude === "" ? null : Number(form.longitude);
    if ((latitude === null) !== (longitude === null)) {
      setError("Enter both latitude and longitude, or leave both blank.");
      return;
    }
    if (
      (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
      || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
    ) {
      setError("Latitude must be between -90 and 90 and longitude between -180 and 180.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/farms", {
        ...form,
        area: Number(form.area),
        ph: form.ph === "" ? null : Number(form.ph),
        nitrogen: form.nitrogen === "" ? null : Number(form.nitrogen),
        phosphorus: form.phosphorus === "" ? null : Number(form.phosphorus),
        potassium: form.potassium === "" ? null : Number(form.potassium),
        latitude,
        longitude,
        boundary: polygonPathToGeoJSON(boundaryPoints),
        ...(existingFarm?._id ? { farmId: existingFarm._id } : {}),
        ...(createNewFarm ? { createNew: true } : {})
      });

      onFarmSaved(response.data.farm);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not save your farm. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`farm-setup-page${embedded ? " farm-setup-page-embedded" : ""}`}>

      <form className={`farm-setup-card${embedded ? " farm-setup-card-embedded" : ""}`} onSubmit={handleSubmit}>

        <div className="farm-setup-logo">
          <Sprout size={26} />
          <strong>AgriSaarthi</strong>
        </div>

        <span className="welcome-label">YOUR FARM PROFILE</span>

        <h1>{existingFarm ? "Edit farm details" : createNewFarm ? "Add another farm" : "Let's set up your farm"}</h1>

        <p className="farm-setup-description">
          {existingFarm
            ? "Update this farm's location, boundary, and profile."
            : "Enter your farm information to receive personalized agricultural recommendations."}
        </p>

        {/* Automatic Location Detection Card */}
        <div
          style={{
            margin: "20px 0 24px 0",
            padding: "20px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <MapPin size={22} color="#15803d" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#166534" }}>
              Agricultural Location Setup
            </h3>
          </div>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
            Click below to automatically detect your coordinates and populate your village, district, state, and pincode via GPS, or enter them manually.
          </p>

          <button
            type="button"
            onClick={detectCurrentLocation}
            disabled={detectingLocation}
            className="primary-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              width: "100%",
              padding: "14px 20px",
              fontSize: "15px",
              fontWeight: "700",
              letterSpacing: "0.5px",
              borderRadius: "10px",
              backgroundColor: "#15803d",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(21, 128, 61, 0.25)",
              cursor: detectingLocation ? "wait" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {detectingLocation ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Detecting your location via GPS...</span>
              </>
            ) : (
              <>
                <MapPin size={20} />
                <span>📍 USE MY CURRENT LOCATION</span>
              </>
            )}
          </button>

          {locationSuccess && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px 16px",
                backgroundColor: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: "8px",
                color: "#166534",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <CheckCircle2 size={18} color="#15803d" />
              <span>{locationSuccess}</span>
            </div>
          )}

          {detectedAddress && (
            <div
              style={{
                marginTop: "10px",
                padding: "10px 14px",
                backgroundColor: "#ffffff",
                border: "1px dashed #86efac",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#166534"
              }}
            >
              <strong>Detected Address:</strong> {detectedAddress}
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                You can review and edit any detected details manually below.
              </div>
            </div>
          )}

          {locationError && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px 16px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#b91c1c",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <AlertCircle size={18} color="#dc2626" />
              <span>{locationError}</span>
            </div>
          )}
        </div>

        <div className="farm-form-grid">

          <div className="farm-input-group">
            <label>Farm Name *</label>
            <input
              name="farmName"
              value={form.farmName}
              onChange={handleChange}
              placeholder="e.g. Green Valley Farm"
              required
            />
          </div>

          <div className="farm-input-group">
            <label>State *</label>
            <input
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="e.g. Karnataka"
              required
            />
          </div>

          <div className="farm-input-group">
            <label>District *</label>
            <input
              name="district"
              value={form.district}
              onChange={handleChange}
              placeholder="e.g. Bengaluru Urban"
              required
            />
          </div>

          <div className="farm-input-group">
            <label>Village / Locality</label>
            <input
              name="village"
              value={form.village}
              onChange={handleChange}
              placeholder="e.g. Yelahanka or nearby village"
            />
          </div>

          <div className="farm-input-group">
            <label>City / Town</label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="e.g. Bengaluru"
            />
          </div>

          <div className="farm-input-group">
            <label>Pincode</label>
            <input
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              placeholder="e.g. 560001"
            />
          </div>

          <div className="farm-input-group">
            <label>Location Label / General Address</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Enter your farm location or landmark"
            />
          </div>

          <div className="farm-input-group">
            <label>Farm Area *</label>
            <div className="farm-area-input">
              <Ruler size={17} />
              <input
                type="number"
                name="area"
                min="0.01"
                step="any"
                value={form.area}
                onChange={handleChange}
                placeholder="e.g. 5"
                required
              />
              <select
                name="areaUnit"
                value={form.areaUnit}
                onChange={handleChange}
              >
                <option value="acres">Acres</option>
                <option value="hectares">Hectares</option>
              </select>
            </div>
          </div>

          <div className="farm-input-group">
            <label>Soil Type</label>
            <select
              name="soilType"
              value={form.soilType}
              onChange={handleChange}
            >
              {["Alluvial", "Black", "Red", "Laterite", "Sandy", "Clay", "Loamy", "Other"].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="farm-input-group">
            <label>Water Source</label>
            <select
              name="waterSource"
              value={form.waterSource}
              onChange={handleChange}
            >
              {["Borewell", "Canal", "Rainwater", "River", "Drip Irrigation", "Other", "Unknown"].map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div className="farm-input-group">
            <label>Irrigation Type</label>
            <select
              name="irrigationType"
              value={form.irrigationType}
              onChange={handleChange}
            >
              {["Unknown", "Drip", "Sprinkler", "Flood", "Rainfed", "Other"].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

        </div>

        <section className="farm-location-section">
          <div className="soil-section-heading">
            <MapPin size={20} />
            <div>
              <strong>Farm Location &amp; Boundaries</strong>
              <span>Optional. Use GPS, enter coordinates, or select your farm on the map.</span>
            </div>
          </div>

          <button type="button" className="farm-location-action" onClick={detectCurrentLocation} disabled={detectingLocation}>
            {detectingLocation ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            {detectingLocation ? "Detecting location..." : "Use my current location"}
          </button>

          <div className="farm-form-grid farm-coordinate-grid">
            <div className="farm-input-group">
              <label htmlFor="farm-latitude">Latitude</label>
              <input
                id="farm-latitude"
                type="number"
                name="latitude"
                min="-90"
                max="90"
                step="any"
                value={form.latitude}
                onChange={handleCoordinateChange}
                placeholder="e.g. 12.9716"
              />
            </div>
            <div className="farm-input-group">
              <label htmlFor="farm-longitude">Longitude</label>
              <input
                id="farm-longitude"
                type="number"
                name="longitude"
                min="-180"
                max="180"
                step="any"
                value={form.longitude}
                onChange={handleCoordinateChange}
                placeholder="e.g. 77.5946"
              />
            </div>
          </div>
          {locationError && <p className="farm-location-message">{locationError}</p>}

          <FarmLocationMap
            center={form.latitude !== "" && form.longitude !== ""
              ? [Number(form.latitude), Number(form.longitude)]
              : null}
            boundaryPath={boundaryPoints}
            onCenterChange={updateCenter}
            onMapClick={handleMapClick}
          />

          <div className="farm-boundary-actions">
            {!drawingBoundary ? (
              <button
                type="button"
                className="farm-location-action"
                onClick={() => {
                  setBoundaryPoints([]);
                  setDrawingBoundary(true);
                  setError("");
                }}
              >
                <MapPin size={16} />
                {boundaryPoints.length >= 3 ? "Redraw boundary" : "Draw farm boundary"}
              </button>
            ) : (
              <>
                <button type="button" className="farm-location-action" onClick={finishBoundary}>
                  <MapPin size={16} />
                  Finish boundary
                </button>
                <button
                  type="button"
                  className="farm-location-action farm-location-action-secondary"
                  onClick={() => setBoundaryPoints((points) => points.slice(0, -1))}
                  disabled={boundaryPoints.length === 0}
                >
                  <Undo2 size={16} />
                  Undo point
                </button>
              </>
            )}
            {boundaryPoints.length > 0 && (
              <button type="button" className="farm-location-action farm-location-action-secondary" onClick={clearBoundary}>
                <Trash2 size={16} />
                Clear boundary
              </button>
            )}
          </div>
          {drawingBoundary && (
            <p className="farm-map-hint">Click the map to add boundary points. Add at least three points, then finish.</p>
          )}
          {areaSquareMeters > 0 && (
            <p className="farm-area-estimate">
              Approximate mapped area: {(areaSquareMeters / SQUARE_METERS_PER_ACRE).toFixed(2)} acres
              {" "}({(areaSquareMeters / SQUARE_METERS_PER_HECTARE).toFixed(2)} hectares)
            </p>
          )}
        </section>

        <div className="soil-section">
          <div className="soil-section-heading">
            <Droplets size={20} />
            <div>
              <strong>Soil Test Information</strong>
              <span>Optional – you can enter this later.</span>
            </div>
          </div>

          <div className="soil-input-grid">
            {[
              ["ph", "Soil pH"],
              ["nitrogen", "Nitrogen (N)"],
              ["phosphorus", "Phosphorus (P)"],
              ["potassium", "Potassium (K)"]
            ].map(([name, label]) => (
              <div className="farm-input-group" key={name}>
                <label>{label}</label>
                <input
                  type="number"
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  min="0"
                  max={name === "ph" ? "14" : undefined}
                  step="any"
                  placeholder="Optional"
                />
              </div>
            ))}
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="farm-setup-actions">
          {onCancel && (
            <button type="button" className="secondary-button" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Saving Farm..." : existingFarm ? "Save Farm Changes" : createNewFarm ? "Add Farm" : "Save Farm & Continue"}
            <MapPin size={18} />
          </button>
        </div>

      </form>

    </div>
  );
}
