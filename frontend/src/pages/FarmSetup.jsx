import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sprout,
  MapPin,
  Ruler,
  Droplets,
  LocateFixed,
  Undo2,
  Redo2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Footprints,
  Play,
  Pause,
  Check,
  Maximize2
} from "lucide-react";
import api from "../services/api";
import FarmLocationMap from "../components/FarmLocationMap";
import {
  calculatePolygonAreaSquareMeters,
  calculateLandArea,
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

  // Search location
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Boundary Drawing & Editing State
  const [boundaryPoints, setBoundaryPoints] = useState(
    () => geoJSONToPolygonPath(existingFarm?.boundary)
  );
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [drawingBoundary, setDrawingBoundary] = useState(false);
  const [drawingMethod, setDrawingMethod] = useState("click"); // "click", "satellite", "walk", "table"
  const [mapType, setMapType] = useState("standard"); // "standard" or "satellite"

  // GPS Walking Mode State
  const [walkingActive, setWalkingActive] = useState(false);
  const [walkingPaused, setWalkingPaused] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [walkingWarning, setWalkingWarning] = useState("");
  const watchIdRef = useRef(null);

  // Manual Coordinate Editing string
  const [manualCoordsText, setManualCoordsText] = useState("");

  const landArea = useMemo(
    () => calculateLandArea(boundaryPoints),
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

  const handleVertexMove = (index, [lat, lng]) => {
    setBoundaryPoints((prev) => {
      const next = [...prev];
      next[index] = [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
      return next;
    });
  };

  // Synchronize manual coords text when switching to table mode
  useEffect(() => {
    if (drawingMethod === "table") {
      setManualCoordsText(boundaryPoints.map(([lat, lng]) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`).join("\n"));
    }
  }, [drawingMethod, boundaryPoints]);

  const applyManualCoords = () => {
    const lines = manualCoordsText.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      const parts = line.split(/[,\s]+/).map(Number);
      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        parsed.push([parts[0], parts[1]]);
      }
    }
    if (parsed.length >= 3) {
      setUndoStack((u) => [...u, boundaryPoints]);
      setBoundaryPoints(parsed);
      setError("");
    } else {
      setError("Enter at least 3 valid coordinate pairs (latitude, longitude) on separate lines.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  // Location search using OpenStreetMap Nominatim
  const handleLocationSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setLocationError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Karnataka, India")}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        updateCenter([lat, lon]);

        // Reverse geocode to get administrative hierarchy
        const geoRes = await api.get("/farms/reverse-geocode", {
          params: { latitude: lat, longitude: lon }
        });
        const addr = geoRes.data;
        setForm((prev) => ({
          ...prev,
          state: addr.state || prev.state,
          district: addr.district || prev.district,
          village: addr.village || prev.village,
          city: addr.city || prev.city,
          pincode: addr.pincode || prev.pincode,
          location: addr.village || addr.city || searchQuery,
          latitude: lat.toFixed(6),
          longitude: lon.toFixed(6)
        }));
        setLocationSuccess(`Location found: ${item.display_name}`);
      } else {
        setLocationError(`Could not find "${searchQuery}". Please check the spelling or enter coordinates manually.`);
      }
    } catch (err) {
      setLocationError("Location search network error. Enter coordinates or click on the map.");
    } finally {
      setSearching(false);
    }
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
      setUndoStack((u) => [...u, boundaryPoints]);
      setRedoStack([]);
      setBoundaryPoints((points) => [...points, position]);
      if (!form.latitude || !form.longitude) {
        updateCenter(position);
      }
      return;
    }

    updateCenter(position);
  };

  // Undo point
  const handleUndoPoint = () => {
    if (boundaryPoints.length === 0) return;
    setRedoStack((r) => [...r, boundaryPoints]);
    setBoundaryPoints((points) => points.slice(0, -1));
  };

  // Redo point
  const handleRedoPoint = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, boundaryPoints]);
    setBoundaryPoints(next);
  };

  // GPS Walking Mode Implementation
  const startGpsWalking = () => {
    if (!navigator.geolocation) {
      setWalkingWarning("GPS walking mode is not supported on this device.");
      return;
    }

    setWalkingActive(true);
    setWalkingPaused(false);
    setWalkingWarning("");
    setDrawingBoundary(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsAccuracy(accuracy);

        if (accuracy > 15) {
          setWalkingWarning(`GPS accuracy is low (±${Math.round(accuracy)}m). Walk slowly in open sky for optimal boundary mapping.`);
        } else {
          setWalkingWarning("");
        }

        if (!walkingPaused) {
          const newPt = [Number(latitude.toFixed(6)), Number(longitude.toFixed(6))];
          setBoundaryPoints((prev) => {
            if (prev.length === 0) return [newPt];
            const last = prev[prev.length - 1];
            // Filter redundant points within ~2 meters
            const latDiff = Math.abs(last[0] - newPt[0]);
            const lonDiff = Math.abs(last[1] - newPt[1]);
            if (latDiff > 0.00002 || lonDiff > 0.00002) {
              return [...prev, newPt];
            }
            return prev;
          });
          if (!form.latitude || !form.longitude) {
            updateCenter([latitude, longitude]);
          }
        }
      },
      (err) => {
        setWalkingWarning(`GPS error: ${err.message}. Ensure location permissions are active.`);
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
  };

  const pauseGpsWalking = () => {
    setWalkingPaused(true);
  };

  const resumeGpsWalking = () => {
    setWalkingPaused(false);
  };

  const finishGpsWalking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWalkingActive(false);
    setWalkingPaused(false);
    finishBoundary();
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const finishBoundary = () => {
    if (boundaryPoints.length < 3) {
      setError("Mark at least three points on the map to define an agricultural boundary.");
      return;
    }

    setDrawingBoundary(false);
    setError("");
    setForm((current) => ({
      ...current,
      area: String(landArea.acres || "")
    }));
  };

  const clearBoundary = () => {
    setUndoStack((u) => [...u, boundaryPoints]);
    setRedoStack([]);
    setBoundaryPoints([]);
    setDrawingBoundary(false);
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWalkingActive(false);
    setForm((current) => ({
      ...current,
      area: ""
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
        area: Number(form.area || landArea.acres || 1),
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
    <div className={`farm-setup-container ${embedded ? "embedded-setup" : ""}`}>
      <div className="farm-setup-header">
        <div className="farm-icon-circle">
          <Sprout size={32} />
        </div>
        <h2>{existingFarm ? "Update Farm Profile" : createNewFarm ? "Add Another Farm" : "Farmer Profile & Farm Setup"}</h2>
        <p>Complete your farm details, set your agricultural location, and accurately map land boundaries.</p>
      </div>

      <form className="farm-setup-form" onSubmit={handleSubmit}>
        <div className="farm-form-grid">
          <div className="farm-input-group">
            <label htmlFor="farmName">Farm / Holding Name *</label>
            <input
              id="farmName"
              name="farmName"
              value={form.farmName}
              onChange={handleChange}
              placeholder="e.g. Raichur Cotton Farm"
              required
            />
          </div>

          <div className="farm-input-group">
            <label htmlFor="location">Village / Locality *</label>
            <input
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Sirwar"
              required
            />
          </div>

          <div className="farm-input-group">
            <label htmlFor="district">District</label>
            <input
              id="district"
              name="district"
              value={form.district}
              onChange={handleChange}
              placeholder="e.g. Raichur"
            />
          </div>

          <div className="farm-input-group">
            <label htmlFor="state">State</label>
            <input
              id="state"
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="e.g. Karnataka"
            />
          </div>

          <div className="farm-input-group">
            <label htmlFor="area">Total Land Area *</label>
            <input
              id="area"
              type="number"
              step="0.01"
              min="0.01"
              name="area"
              value={form.area}
              onChange={handleChange}
              placeholder="e.g. 5.5"
              required
            />
          </div>

          <div className="farm-input-group">
            <label htmlFor="areaUnit">Area Unit</label>
            <select
              id="areaUnit"
              name="areaUnit"
              value={form.areaUnit}
              onChange={handleChange}
            >
              <option value="acres">Acres</option>
              <option value="hectares">Hectares</option>
            </select>
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

        {/* Phase 1.2: Location Selection & Search Bar */}
        <section className="farm-location-section" style={{ background: "#ffffff", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0", marginTop: "16px" }}>
          <div className="soil-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={22} color="#16a34a" />
              <div>
                <strong style={{ fontSize: "15px", color: "#166534" }}>Farm Location & Boundary Mapping</strong>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  Select via GPS, village search, or map drawing. Geodesic area calculation in acres and hectares.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="farm-location-action"
              onClick={detectCurrentLocation}
              disabled={detectingLocation}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              {detectingLocation ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
              {detectingLocation ? "Detecting GPS..." : "📍 Use My Current Location"}
            </button>
          </div>

          {/* Village / Town Search Bar */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                placeholder="Search village, town, or district in Karnataka..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLocationSearch(e)}
                style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: 10, top: 10 }} />
            </div>
            <button
              type="button"
              onClick={handleLocationSearch}
              disabled={searching}
              style={{ padding: "8px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {locationSuccess && (
            <div style={{ fontSize: "12px", color: "#15803d", backgroundColor: "#f0fdf4", padding: "8px 12px", borderRadius: "6px", border: "1px solid #bbf7d0", marginBottom: "12px" }}>
              ✓ {locationSuccess}
            </div>
          )}
          {locationError && (
            <div style={{ fontSize: "12px", color: "#b91c1c", backgroundColor: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fecaca", marginBottom: "12px" }}>
              ⚠ {locationError}
            </div>
          )}

          {/* Phase 2.1: 4 Drawing Methods Selector */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setDrawingMethod("click");
                setDrawingBoundary(true);
                setMapType("standard");
              }}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                borderRadius: "6px",
                border: drawingMethod === "click" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                background: drawingMethod === "click" ? "#f0fdf4" : "#ffffff",
                color: drawingMethod === "click" ? "#166534" : "#475569",
                cursor: "pointer"
              }}
            >
              ✏ 1. Manual Polygon Drawing
            </button>

            <button
              type="button"
              onClick={() => {
                setDrawingMethod("satellite");
                setDrawingBoundary(true);
                setMapType("satellite");
              }}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                borderRadius: "6px",
                border: drawingMethod === "satellite" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                background: drawingMethod === "satellite" ? "#f0fdf4" : "#ffffff",
                color: drawingMethod === "satellite" ? "#166534" : "#475569",
                cursor: "pointer"
              }}
            >
              🛰 2. Satellite Boundary Drawing
            </button>

            <button
              type="button"
              onClick={() => {
                setDrawingMethod("walk");
                setDrawingBoundary(true);
              }}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                borderRadius: "6px",
                border: drawingMethod === "walk" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                background: drawingMethod === "walk" ? "#f0fdf4" : "#ffffff",
                color: drawingMethod === "walk" ? "#166534" : "#475569",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Footprints size={14} />
              3. GPS Walking Mode
            </button>

            <button
              type="button"
              onClick={() => {
                setDrawingMethod("table");
              }}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                borderRadius: "6px",
                border: drawingMethod === "table" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                background: drawingMethod === "table" ? "#f0fdf4" : "#ffffff",
                color: drawingMethod === "table" ? "#166534" : "#475569",
                cursor: "pointer"
              }}
            >
              📝 4. Coordinate Table Entry
            </button>
          </div>

          {/* Phase 2.2: GPS Walking Mode Controller Banner */}
          {drawingMethod === "walk" && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <strong style={{ fontSize: "13px", color: "#166534" }}>GPS Walking Mode Active</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#475569" }}>
                    Walk along your farmland perimeter. The app logs your GPS points automatically.
                  </p>
                  {gpsAccuracy !== null && (
                    <span style={{ fontSize: "11px", color: gpsAccuracy <= 15 ? "#15803d" : "#b45309", fontWeight: "600" }}>
                      GPS Accuracy: ±{Math.round(gpsAccuracy)} meters ({gpsAccuracy <= 10 ? "High" : gpsAccuracy <= 20 ? "Moderate" : "Low"})
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  {!walkingActive ? (
                    <button
                      type="button"
                      onClick={startGpsWalking}
                      style={{ padding: "6px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <Play size={13} /> Start Recording
                    </button>
                  ) : walkingPaused ? (
                    <button
                      type="button"
                      onClick={resumeGpsWalking}
                      style={{ padding: "6px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <Play size={13} /> Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseGpsWalking}
                      style={{ padding: "6px 12px", background: "#ca8a04", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <Pause size={13} /> Pause
                    </button>
                  )}

                  {walkingActive && (
                    <button
                      type="button"
                      onClick={finishGpsWalking}
                      style={{ padding: "6px 12px", background: "#0f766e", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                    >
                      Finish & Close
                    </button>
                  )}
                </div>
              </div>

              {walkingWarning && (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#b45309" }}>
                  ⚠ {walkingWarning}
                </div>
              )}
            </div>
          )}

          {/* Phase 2.1: Coordinate Table Entry Drawer */}
          {drawingMethod === "table" && (
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                Boundary Coordinates (one pair per line: latitude, longitude)
              </label>
              <textarea
                rows={5}
                value={manualCoordsText}
                onChange={(e) => setManualCoordsText(e.target.value)}
                placeholder="16.205120, 77.354120&#10;16.206250, 77.355320&#10;16.204890, 77.356100"
                style={{ width: "100%", padding: "8px", fontFamily: "monospace", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
              <button
                type="button"
                onClick={applyManualCoords}
                style={{ marginTop: "6px", padding: "6px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >
                Apply Coordinates to Map
              </button>
            </div>
          )}

          {/* Map Container */}
          <FarmLocationMap
            center={form.latitude !== "" && form.longitude !== ""
              ? [Number(form.latitude), Number(form.longitude)]
              : null}
            boundaryPath={boundaryPoints}
            onCenterChange={updateCenter}
            onMapClick={handleMapClick}
            onVertexMove={handleVertexMove}
            mapType={mapType}
            onMapTypeToggle={setMapType}
            drawingMode={drawingBoundary}
          />

          {/* Point Manipulation Actions: Undo, Redo, Delete Last, Clear, Finish */}
          <div className="farm-boundary-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px", alignItems: "center" }}>
            {drawingBoundary ? (
              <button
                type="button"
                className="farm-location-action"
                onClick={finishBoundary}
                style={{ background: "#166534", color: "#ffffff", border: "none", padding: "7px 14px", borderRadius: "6px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
              >
                ✓ Automatically Close & Finish Boundary
              </button>
            ) : (
              <button
                type="button"
                className="farm-location-action"
                onClick={() => setDrawingBoundary(true)}
                style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "7px 14px", borderRadius: "6px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
              >
                ✏ {boundaryPoints.length >= 3 ? "Edit / Redraw Boundary" : "Draw Boundary Points"}
              </button>
            )}

            <button
              type="button"
              onClick={handleUndoPoint}
              disabled={boundaryPoints.length === 0}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "7px 12px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", cursor: boundaryPoints.length > 0 ? "pointer" : "not-allowed" }}
            >
              <Undo2 size={14} /> Undo Point
            </button>

            <button
              type="button"
              onClick={handleRedoPoint}
              disabled={redoStack.length === 0}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "7px 12px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", cursor: redoStack.length > 0 ? "pointer" : "not-allowed" }}
            >
              <Redo2 size={14} /> Redo Point
            </button>

            {boundaryPoints.length > 0 && (
              <button
                type="button"
                onClick={clearBoundary}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "7px 12px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
              >
                <Trash2 size={14} /> Clear Boundary
              </button>
            )}

            {/* Calculated Area Display */}
            {landArea.acres > 0 && (
              <div style={{ marginLeft: "auto", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", color: "#065f46", fontWeight: "700" }}>
                📐 Calculated Area: {landArea.formattedAcres} ({landArea.formattedHectares})
              </div>
            )}
          </div>
        </section>

        {/* Soil Test Information Section */}
        <div className="soil-section" style={{ marginTop: "16px" }}>
          <div className="soil-section-heading">
            <Droplets size={20} />
            <div>
              <strong>Soil Test Information</strong>
              <span>Optional – you can enter lab test values or use Karnataka benchmarks.</span>
            </div>
          </div>

          <div className="soil-input-grid">
            {[
              ["ph", "Soil pH"],
              ["nitrogen", "Nitrogen (N) kg/ha"],
              ["phosphorus", "Phosphorus (P) kg/ha"],
              ["potassium", "Potassium (K) kg/ha"]
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

        <div className="farm-setup-actions" style={{ marginTop: "20px" }}>
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
