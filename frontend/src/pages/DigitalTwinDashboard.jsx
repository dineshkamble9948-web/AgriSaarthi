import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Cloud,
  Droplets,
  Leaf,
  MapPin,
  Plus,
  RefreshCw,
  Ruler,
  Sprout,
  Wheat
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api from "../services/api";
import FarmLocationMap from "../components/FarmLocationMap";
import FarmSetup from "./FarmSetup";
import {
  calculatePolygonAreaSquareMeters,
  geoJSONToPolygonPath,
  polygonPathToGeoJSON
} from "../utils/geospatial";

const CROP_STAGES = [
  "Land Preparation",
  "Sowing",
  "Germination",
  "Vegetative Growth",
  "Flowering",
  "Maturity",
  "Harvesting"
];
const SQUARE_METERS_PER_ACRE = 4046.8564224;
const SQUARE_METERS_PER_HECTARE = 10000;
const EMPTY_TWIN_DATA = {
  plots: [],
  cycles: [],
  weather: null,
  soilHistory: [],
  weatherHistory: [],
  satellite: null,
  satelliteHistory: [],
  irrigation: null,
  irrigationRecords: [],
  alerts: []
};

const requestError = (error, fallback) => (
  error.response?.data?.message || fallback
);

const formatNumber = (value, digits = 1) => (
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value)
    : "Unavailable"
);

const formatDate = (value) => {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleDateString();
};

function MetricCard({ icon: Icon, label, value, detail, tone = "" }) {
  return (
    <article className={`twin-metric-card${tone ? ` twin-tone-${tone}` : ""}`}>
      <div className="twin-metric-icon"><Icon size={18} /></div>
      <div className="twin-metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </article>
  );
}

function PlotEditor({ farm, plot, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    plotName: plot?.plotName || "",
    currentCrop: plot?.currentCrop || "",
    area: plot?.area == null ? "" : String(plot.area),
    areaUnit: plot?.areaUnit || farm.areaUnit || "acres",
    irrigationType: plot?.irrigationType || "Unknown",
    latitude: plot?.latitude == null ? String(farm.latitude ?? "") : String(plot.latitude),
    longitude: plot?.longitude == null ? String(farm.longitude ?? "") : String(plot.longitude)
  }));
  const [boundaryPoints, setBoundaryPoints] = useState(
    () => geoJSONToPolygonPath(plot?.boundary)
  );
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const areaSquareMeters = useMemo(
    () => calculatePolygonAreaSquareMeters(boundaryPoints),
    [boundaryPoints]
  );

  const areaFromBoundary = (unit) => (
    areaSquareMeters > 0
      ? (areaSquareMeters / (unit === "hectares" ? SQUARE_METERS_PER_HECTARE : SQUARE_METERS_PER_ACRE)).toFixed(2)
      : ""
  );

  const changeCenter = ([latitude, longitude]) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6)
    }));
  };

  const handleMapClick = (position) => {
    if (drawing) {
      setBoundaryPoints((points) => [...points, position]);
      if (!form.latitude || !form.longitude) changeCenter(position);
    } else {
      changeCenter(position);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const latitude = form.latitude === "" ? null : Number(form.latitude);
    const longitude = form.longitude === "" ? null : Number(form.longitude);
    if ((latitude === null) !== (longitude === null)) {
      setError("Enter both plot coordinates or leave both blank.");
      return;
    }
    if (
      (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
      || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
    ) {
      setError("Latitude must be between -90 and 90 and longitude between -180 and 180.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        area: Number(form.area || areaFromBoundary(form.areaUnit)),
        latitude,
        longitude,
        boundary: polygonPathToGeoJSON(boundaryPoints)
      };
      const url = `/farms/${farm._id}/plots${plot?._id ? `/${plot._id}` : ""}`;
      const response = plot?._id
        ? await api.patch(url, payload)
        : await api.post(url, payload);
      onSaved(response.data.plot);
    } catch (saveError) {
      setError(requestError(saveError, "Could not save this plot."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="twin-editor-card" onSubmit={handleSubmit}>
      <div className="twin-section-heading">
        <div><h3>{plot ? "Edit plot" : "Add a plot"}</h3><p>Set a plot center or map its boundary.</p></div>
        <button type="button" className="twin-icon-button" onClick={onCancel} aria-label="Close plot editor">×</button>
      </div>
      <div className="twin-form-grid">
        <label>Plot name<input value={form.plotName} onChange={(event) => setForm({ ...form, plotName: event.target.value })} required /></label>
        <label>Current crop<input value={form.currentCrop} onChange={(event) => setForm({ ...form, currentCrop: event.target.value })} placeholder="Optional" /></label>
        <label>Area<input type="number" min="0.01" step="any" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} required /></label>
        <label>Area unit
          <select value={form.areaUnit} onChange={(event) => setForm({
            ...form,
            areaUnit: event.target.value,
            area: areaFromBoundary(event.target.value) || form.area
          })}>
            <option value="acres">Acres</option><option value="hectares">Hectares</option>
          </select>
        </label>
        <label>Irrigation type
          <select value={form.irrigationType} onChange={(event) => setForm({ ...form, irrigationType: event.target.value })}>
            {["Unknown", "Drip", "Sprinkler", "Flood", "Rainfed", "Other"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>Latitude<input type="number" min="-90" max="90" step="any" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} /></label>
        <label>Longitude<input type="number" min="-180" max="180" step="any" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} /></label>
      </div>
      <FarmLocationMap
        center={form.latitude !== "" && form.longitude !== "" ? [Number(form.latitude), Number(form.longitude)] : null}
        boundaryPath={boundaryPoints}
        onCenterChange={changeCenter}
        onMapClick={handleMapClick}
        showHint={false}
      />
      <div className="twin-editor-actions">
        <button type="button" className="secondary-button" onClick={() => {
          if (drawing) {
            setDrawing(false);
          } else {
            setBoundaryPoints([]);
            setDrawing(true);
          }
        }}>
          {drawing ? "Stop drawing" : boundaryPoints.length ? "Redraw boundary" : "Draw boundary"}
        </button>
        {drawing && (
          <button type="button" className="secondary-button" onClick={() => {
            if (boundaryPoints.length < 3) {
              setError("Add at least three boundary points.");
              return;
            }
            setDrawing(false);
            setForm((current) => ({ ...current, area: areaFromBoundary(current.areaUnit) }));
          }}>
            Finish boundary
          </button>
        )}
        {boundaryPoints.length > 0 && (
          <button type="button" className="secondary-button" onClick={() => setBoundaryPoints((points) => points.slice(0, -1))}>
            Undo point
          </button>
        )}
        <span className="twin-muted">Mapped area: {formatNumber(areaSquareMeters / SQUARE_METERS_PER_ACRE, 2)} acres</span>
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <div className="twin-editor-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save plot"}</button>
      </div>
    </form>
  );
}

function CropCycleEditor({ farm, plotId, onCancel, onSaved }) {
  const [form, setForm] = useState({
    cropName: "",
    cropVariety: "",
    sowingDate: "",
    expectedHarvestDate: "",
    irrigationMethod: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await api.post(`/farms/${farm._id}/crops`, {
        ...form,
        ...(plotId ? { plotId } : {})
      });
      onSaved(response.data.cycle);
    } catch (saveError) {
      setError(requestError(saveError, "Could not save crop cycle."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="twin-editor-card" onSubmit={handleSubmit}>
      <div className="twin-section-heading">
        <div><h3>Register crop cycle</h3><p>Stage estimates use these farmer-entered dates.</p></div>
        <button type="button" className="twin-icon-button" onClick={onCancel} aria-label="Close crop form">×</button>
      </div>
      <div className="twin-form-grid">
        <label>Crop name<input value={form.cropName} onChange={(event) => setForm({ ...form, cropName: event.target.value })} required /></label>
        <label>Variety<input value={form.cropVariety} onChange={(event) => setForm({ ...form, cropVariety: event.target.value })} /></label>
        <label>Sowing date<input type="date" value={form.sowingDate} onChange={(event) => setForm({ ...form, sowingDate: event.target.value })} required /></label>
        <label>Expected harvest<input type="date" value={form.expectedHarvestDate} onChange={(event) => setForm({ ...form, expectedHarvestDate: event.target.value })} required /></label>
        <label>Irrigation method<input value={form.irrigationMethod} onChange={(event) => setForm({ ...form, irrigationMethod: event.target.value })} placeholder="Optional" /></label>
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <div className="twin-editor-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save crop cycle"}</button>
      </div>
    </form>
  );
}

const areaLabel = (farm) => (
  farm?.area == null ? "Unavailable" : `${formatNumber(Number(farm.area), 2)} ${farm.areaUnit || "acres"}`
);

export default function DigitalTwinDashboard({ farm: initialFarm, onFarmUpdated, setActivePage }) {
  const [farms, setFarms] = useState(initialFarm ? [initialFarm] : []);
  const [selectedFarmId, setSelectedFarmId] = useState(initialFarm?._id || "");
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [farmsError, setFarmsError] = useState("");
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [editor, setEditor] = useState(null);
  const [plotEditor, setPlotEditor] = useState(null);
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [data, setData] = useState(EMPTY_TWIN_DATA);
  const [errors, setErrors] = useState({});
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/farms")
      .then(({ data: response }) => {
        if (!active) return;
        const farmList = Array.isArray(response.farms) ? response.farms : [];
        setFarms(farmList);
        setSelectedFarmId((current) => (
          farmList.some((item) => String(item._id) === String(current))
            ? current
            : farmList[0]?._id || ""
        ));
        setFarmsError("");
      })
      .catch((error) => {
        if (!active) return;
        setFarmsError(requestError(error, "Could not load your farms."));
        if (initialFarm) setFarms([initialFarm]);
      })
      .finally(() => {
        if (active) setFarmsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialFarm]);

  const selectedFarm = farms.find((item) => String(item._id) === String(selectedFarmId)) || initialFarm || null;

  useEffect(() => {
    if (!selectedFarm?._id) return undefined;
    let active = true;
    const farmId = selectedFarm._id;
    const plotParams = selectedPlotId ? { plotId: selectedPlotId } : {};
    const requests = {
      plots: api.get(`/farms/${farmId}/plots`),
      cycles: api.get(`/farms/${farmId}/crops`),
      weather: api.get("/weather", { params: { farmId } }),
      soilHistory: api.get("/soil/history", { params: { farmId, ...plotParams } }),
      weatherHistory: api.get("/weather/history", { params: { farmId } }),
      satellite: api.get(`/farms/${farmId}/satellite`, { params: plotParams }),
      satelliteHistory: api.get(`/farms/${farmId}/satellite/history`, { params: plotParams }),
      irrigation: api.get(`/farms/${farmId}/irrigation`, { params: plotParams }),
      irrigationRecords: api.get("/records", {
        params: { farmId, activityType: "Irrigation" }
      })
    };

    Promise.all(Object.entries(requests).map(async ([key, request]) => {
      try {
        const response = await request;
        return [key, { data: response.data, error: "" }];
      } catch (error) {
        return [key, {
          data: null,
          error: requestError(error, `${key} data is unavailable.`)
        }];
      }
    })).then(async (results) => {
      if (!active) return;
      const nextData = {};
      const nextErrors = {};
      results.forEach(([key, result]) => {
        if (result.error) {
          nextErrors[key] = result.error;
          if (key === "plots" || key === "cycles") nextData[key] = [];
          else if (key === "soilHistory" || key === "weatherHistory" || key === "satelliteHistory" || key === "irrigationRecords") nextData[key] = [];
          else nextData[key] = null;
          return;
        }
        const keyMap = {
          plots: "plots",
          cycles: "cycles",
          weather: "weather",
          soilHistory: "history",
          weatherHistory: "history",
          satellite: "monitoring",
          satelliteHistory: "history",
          irrigation: "guidance",
          irrigationRecords: "records"
        };
        nextData[key] = result.data[keyMap[key]] ?? null;
      });
      setData((current) => ({ ...current, ...nextData }));
      setErrors(nextErrors);
      if (selectedPlotId && !nextData.plots?.some((plot) => String(plot._id) === String(selectedPlotId))) {
        setSelectedPlotId("");
      }
      try {
        const response = await api.get(`/farms/${farmId}/alerts`);
        if (active) {
          setData((current) => ({ ...current, alerts: response.data.alerts || [] }));
        }
      } catch (error) {
        if (active) {
          setErrors((current) => ({
            ...current,
            alerts: requestError(error, "Farm alerts are unavailable.")
          }));
        }
      } finally {
        if (active) setDataLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedFarm?._id, selectedPlotId, refreshKey]);

  const selectedPlot = data.plots.find((plot) => String(plot._id) === String(selectedPlotId)) || null;
  const currentCropCycle = useMemo(() => {
    return data.cycles.find((cycle) => (
      !cycle.actualHarvestDate
      && (cycle.progressPercent == null || cycle.progressPercent < 100)
      && (!selectedPlotId || String(cycle.plot) === String(selectedPlotId))
    )) || data.cycles.find((cycle) => !selectedPlotId || String(cycle.plot) === String(selectedPlotId)) || null;
  }, [data.cycles, selectedPlotId]);
  const latestSoilAssessment = data.soilHistory[0] || null;
  const soilPh = latestSoilAssessment?.soilParameters?.ph?.value;
  const weather = data.weather;
  const satellite = data.satellite;
  const cropStage = currentCropCycle?.currentStage || currentCropCycle?.growthStage || null;
  const mappedPlotOverlays = data.plots.map((plot) => ({
    id: String(plot._id),
    label: plot.plotName,
    path: geoJSONToPolygonPath(plot.boundary)
  })).filter((plot) => plot.path.length >= 3);

  const weatherChartData = data.weatherHistory.map((record) => ({
    date: formatDate(record.sourceFetchedAt),
    temperature: record.weather?.current?.temperatureC ?? null,
    rainfall: record.weather?.current?.rainfallLastHourMm ?? null
  })).reverse();
  const ndviChartData = (satellite?.ndviSeries || []).map((item) => ({
    date: formatDate(item.date),
    ndvi: item.mean
  }));
  const savedNdviChartData = data.satelliteHistory
    .map((item) => ({
      date: formatDate(item.latestObservation || item.retrievedAt),
      ndvi: item.latestNDVI
    }))
    .filter((item) => Number.isFinite(item.ndvi))
    .reverse();
  const displayNdviChartData = ndviChartData.length ? ndviChartData : savedNdviChartData;
  const irrigationChartData = data.irrigationRecords
    .map((record) => ({
      date: formatDate(record.date),
      quantity: Number(record.quantity) || 0,
      unit: record.unit || ""
    }))
    .reverse();
  const alerts = data.alerts;

  const healthSummary = satellite
    ? `NDVI ${satellite.classification}; ${data.irrigation?.status || "irrigation data unavailable"}`
    : "Insufficient satellite data for an overall health summary";
  const updateFarms = async (preferredId) => {
    try {
      const response = await api.get("/farms");
      const list = Array.isArray(response.data.farms) ? response.data.farms : [];
      setFarms(list);
      if (preferredId) setSelectedFarmId(preferredId);
      setFarmsError("");
    } catch (error) {
      setFarmsError(requestError(error, "Could not refresh your farms."));
    }
  };

  const handleFarmSaved = async (savedFarm) => {
    setEditor(null);
    setDataLoading(true);
    setData(EMPTY_TWIN_DATA);
    setErrors({});
    await updateFarms(String(savedFarm._id));
    onFarmUpdated?.(savedFarm);
    setRefreshKey((key) => key + 1);
  };

  const handlePlotSaved = (savedPlot) => {
    setPlotEditor(null);
    setDataLoading(true);
    setData(EMPTY_TWIN_DATA);
    setErrors({});
    if (savedPlot?._id) setSelectedPlotId(String(savedPlot._id));
    setRefreshKey((key) => key + 1);
  };

  const handleCropSaved = () => {
    setShowCropEditor(false);
    setDataLoading(true);
    setData(EMPTY_TWIN_DATA);
    setErrors({});
    setRefreshKey((key) => key + 1);
  };

  const updateCropStage = async (cycle, growthStage) => {
    try {
      await api.patch(`/farms/${selectedFarm._id}/crops/${cycle._id}`, { growthStage });
      setDataLoading(true);
      setErrors({});
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        cycles: requestError(error, "Could not update the crop stage.")
      }));
    }
  };

  const acknowledgeAlert = async (alert) => {
    try {
      const response = await api.patch(
        `/farms/${selectedFarm._id}/alerts/${alert._id}/acknowledge`
      );
      setData((current) => ({
        ...current,
        alerts: current.alerts.map((item) => (
          String(item._id) === String(alert._id) ? response.data.alert : item
        ))
      }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        alerts: requestError(error, "Could not acknowledge this alert.")
      }));
    }
  };

  if (!selectedFarm && farmsLoading) {
    return <div className="panel twin-loading"><RefreshCw className="twin-spin" size={18} /> Loading farms...</div>;
  }
  if (!selectedFarm) {
    return (
      <div className="digital-twin">
        {farmsError && <div className="twin-error" role="alert">{farmsError}</div>}
        <div className="panel twin-empty">
          <MapPin size={28} />
          <h2>No farms are registered</h2>
          <p>Add a farm to start its location-aware Digital Twin. You may enter coordinates manually and do not have to share device location.</p>
          <button className="primary-button" onClick={() => setEditor({ mode: "create" })}>
            <Plus size={16} /> Add farm
          </button>
        </div>
        {editor && (
          <div className="digital-twin-editor-overlay">
            <FarmSetup
              key="new-farm"
              embedded
              createNewFarm
              onFarmSaved={handleFarmSaved}
              onCancel={() => setEditor(null)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="digital-twin">
      <section className="twin-toolbar panel">
        <div>
          <span className="welcome-label">FARM MONITORING</span>
          <h2>Your Digital Twin</h2>
          <p>External data is shown with its source; unavailable inputs stay unavailable.</p>
        </div>
        <div className="twin-toolbar-actions">
          <label className="twin-select-label">Farm
            <select value={selectedFarmId} onChange={(event) => {
              setSelectedFarmId(event.target.value);
              setSelectedPlotId("");
              setData(EMPTY_TWIN_DATA);
              setErrors({});
              setDataLoading(true);
            }}>
              {farms.map((item) => <option key={item._id} value={item._id}>{item.farmName}</option>)}
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={() => setEditor({ mode: "edit", farm: selectedFarm })}>
            Edit farm
          </button>
          <button type="button" className="primary-button" onClick={() => setEditor({ mode: "create" })}>
            <Plus size={15} /> Add farm
          </button>
          <button
            type="button"
            className="twin-refresh-button"
            onClick={() => {
              setDataLoading(true);
              setErrors({});
              setRefreshKey((key) => key + 1);
            }}
            disabled={dataLoading}
            aria-label="Refresh farm data"
          >
            <RefreshCw size={16} className={dataLoading ? "twin-spin" : ""} />
          </button>
        </div>
      </section>

      {farmsError && <div className="twin-error" role="alert">{farmsError}</div>}

      <section className="twin-metric-grid">
        <MetricCard icon={MapPin} label="Farm location" value={selectedFarm.location || "Unavailable"} detail={
          selectedFarm.latitude != null && selectedFarm.longitude != null
            ? `${formatNumber(Number(selectedFarm.latitude), 5)}, ${formatNumber(Number(selectedFarm.longitude), 5)}`
            : "No coordinates saved"
        } />
        <MetricCard icon={Ruler} label="Total farm area" value={areaLabel(selectedFarm)} detail={data.plots.length ? `${data.plots.length} plots recorded` : "Farm profile"} />
        <MetricCard icon={Sprout} label="Current crop" value={currentCropCycle?.cropName || selectedPlot?.currentCrop || "Not recorded"} detail={currentCropCycle?.cropVariety || selectedPlot?.plotName || "Add a crop cycle"} />
        <MetricCard icon={Cloud} label="Current weather" value={weather?.current?.temperatureC == null ? "Unavailable" : `${formatNumber(weather.current.temperatureC)}°C`} detail={weather?.current?.condition?.description || errors.weather || "Weather source unavailable"} tone={weather ? "blue" : "muted"} />
        <MetricCard icon={Droplets} label="Soil health" value={Number.isFinite(soilPh) ? `pH ${formatNumber(soilPh, 2)}` : "Unavailable"} detail={latestSoilAssessment ? `${latestSoilAssessment.source === "SoilGrids" ? "Modelled estimate" : "Laboratory report"} · ${formatDate(latestSoilAssessment.retrievedAt || latestSoilAssessment.createdAt)}` : errors.soilHistory || "No linked soil report"} />
        <MetricCard icon={Leaf} label="Vegetation health" value={satellite ? `${formatNumber(satellite.latestNDVI, 2)} · ${satellite.classification}` : "Unavailable"} detail={satellite ? `Sentinel-2 · ${formatDate(satellite.latestObservation)}` : errors.satellite || "Satellite data unavailable"} tone={satellite?.classification || "muted"} />
        <MetricCard icon={Wheat} label="Crop growth stage" value={cropStage || "Unavailable"} detail={currentCropCycle?.stageSource === "farmer-updated" ? "Farmer-updated" : currentCropCycle ? "Estimated from farmer-entered dates" : "No crop cycle"} />
        <MetricCard icon={Droplets} label="Irrigation status" value={data.irrigation?.status || "Insufficient data"} detail={data.irrigation?.recommendedTiming || errors.irrigation || "Guidance unavailable"} />
        <MetricCard icon={Sprout} label="Farm health overview" value={satellite ? "Monitoring available" : "Data limited"} detail={healthSummary} tone={satellite?.classification || "muted"} />
      </section>

      <section className="twin-main-grid">
        <div className="panel twin-map-panel">
          <div className="twin-section-heading">
            <div><h3>Farm map</h3><p>{selectedFarm.village || selectedFarm.location}{selectedFarm.district ? ` · ${selectedFarm.district}` : ""}{selectedFarm.state ? ` · ${selectedFarm.state}` : ""}</p></div>
            <label className="twin-select-label">Plot
              <select value={selectedPlotId} onChange={(event) => {
                setSelectedPlotId(event.target.value);
                setData(EMPTY_TWIN_DATA);
                setErrors({});
                setDataLoading(true);
              }}>
                <option value="">Entire farm</option>
                {data.plots.map((plot) => <option key={plot._id} value={plot._id}>{plot.plotName}</option>)}
              </select>
            </label>
          </div>
          <FarmLocationMap
            center={selectedPlot?.latitude != null && selectedPlot?.longitude != null
              ? [Number(selectedPlot.latitude), Number(selectedPlot.longitude)]
              : selectedFarm.latitude != null && selectedFarm.longitude != null
                ? [Number(selectedFarm.latitude), Number(selectedFarm.longitude)]
                : null}
            boundaryPath={geoJSONToPolygonPath(selectedFarm.boundary)}
            overlays={mappedPlotOverlays}
            selectedOverlayId={selectedPlotId}
            onOverlaySelect={(plotId) => {
              setSelectedPlotId(plotId);
              setData(EMPTY_TWIN_DATA);
              setErrors({});
              setDataLoading(true);
            }}
            interactive={false}
            showHint={false}
          />
          <div className="twin-map-footer">
            <span><i className="twin-map-legend farm" /> Farm boundary</span>
            <span><i className="twin-map-legend plot" /> Plots (select on map)</span>
            <button type="button" className="secondary-button" onClick={() => setPlotEditor({ mode: "create" })}>
              <Plus size={14} /> Add plot
            </button>
            {selectedPlot && (
              <button type="button" className="secondary-button" onClick={() => setPlotEditor({ mode: "edit", plot: selectedPlot })}>
                Edit plot
              </button>
            )}
          </div>
          {data.plots.length === 0 && <p className="twin-muted">No plots are recorded yet. Add a plot and optionally draw its boundary.</p>}
        </div>

        <div className="panel twin-vegetation-panel">
          <div className="twin-section-heading">
            <div><h3>Vegetation monitoring</h3><p>Sentinel-2 L2A · NDVI estimates</p></div>
            {satellite?.classification && <span className={`twin-status-pill twin-tone-${satellite.classification}`}>{satellite.classification}</span>}
          </div>
          {satellite?.imagery?.status === "available" ? (
            <figure className="twin-satellite-image">
              <img src={satellite.imagery.dataUri} alt="Colorized Sentinel-2 NDVI image for the selected farm area" />
              <figcaption>Real Sentinel-2 imagery, colorized by NDVI. Latest observation: {formatDate(satellite.latestObservation)}.</figcaption>
            </figure>
          ) : (
            <div className="twin-unavailable">
              <Leaf size={22} />
              <strong>Satellite imagery unavailable</strong>
              <p>{satellite?.imagery?.message || errors.satellite || "Configure CDSE credentials and a valid farm area to retrieve satellite data."}</p>
            </div>
          )}
          <p className="twin-data-note">{satellite?.classificationNote || "NDVI is a satellite-derived estimate; it is not a crop diagnosis."}</p>
        </div>
      </section>

      <section className="twin-chart-grid">
        <div className="panel twin-chart-panel">
          <div className="twin-section-heading"><div><h3>Weather snapshots</h3><p>Observed temperature and one-hour rainfall at each saved fetch time.</p></div></div>
          {weatherChartData.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={weatherChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9eee9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="temperature" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="rainfall" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line yAxisId="temperature" type="monotone" dataKey="temperature" name="Temperature °C" stroke="#e49a39" connectNulls />
                <Line yAxisId="rainfall" type="monotone" dataKey="rainfall" name="Rain last hour mm" stroke="#3989c9" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="twin-muted">{errors.weatherHistory || "Weather history will appear after successful farm weather lookups."}</p>}
        </div>

        <div className="panel twin-chart-panel">
          <div className="twin-section-heading"><div><h3>NDVI history</h3><p>Ten-day Sentinel-2 mean series; gaps are not interpolated.</p></div></div>
          {displayNdviChartData.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={displayNdviChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9eee9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="ndvi" name="NDVI" stroke="#2d8a4b" fill="#cfe8d2" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="twin-muted">{errors.satellite || "NDVI history will appear after a successful satellite lookup."}</p>}
        </div>
      </section>

      <section className="twin-detail-grid">
        <div className="panel">
          <div className="twin-section-heading">
            <div><h3>Crop lifecycle</h3><p>Timeline estimated from farmer-entered dates unless a stage was manually updated.</p></div>
            <button type="button" className="secondary-button" onClick={() => setShowCropEditor(true)}><Plus size={14} /> Add crop</button>
          </div>
          {currentCropCycle ? (
            <div className="twin-crop-detail">
              <div><strong>{currentCropCycle.cropName}</strong>{currentCropCycle.cropVariety && <span>{currentCropCycle.cropVariety}</span>}</div>
              <p>Sown {formatDate(currentCropCycle.sowingDate)} · Expected harvest {formatDate(currentCropCycle.expectedHarvestDate)} · {currentCropCycle.durationDays} days</p>
              {currentCropCycle.progressPercent != null && (
                <>
                  <small className="twin-muted">Estimated share of expected duration elapsed</small>
                  <ResponsiveContainer width="100%" height={74}>
                    <BarChart
                      layout="vertical"
                      data={[{
                        label: "Crop timeline",
                        elapsed: currentCropCycle.progressPercent,
                        remaining: 100 - currentCropCycle.progressPercent
                      }]}
                      margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                    >
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="elapsed" name="Elapsed (%)" stackId="duration" fill="#398b52" />
                      <Bar dataKey="remaining" name="Remaining (%)" stackId="duration" fill="#e5eee5" />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
              <div className="twin-stage-update">
                <label>Growth stage
                  <select
                    value={currentCropCycle.stageUpdatedManually ? currentCropCycle.growthStage : ""}
                    onChange={(event) => event.target.value && updateCropStage(currentCropCycle, event.target.value)}
                  >
                    <option value="">Estimated: {currentCropCycle.currentStage}</option>
                    {CROP_STAGES.map((stage) => <option key={stage} value={stage}>{stage} (set manually)</option>)}
                  </select>
                </label>
                {currentCropCycle.stageUpdatedManually && <small>Farmer-updated stage</small>}
              </div>
            </div>
          ) : (
            <div className="twin-unavailable"><Sprout size={22} /><strong>No active crop cycle</strong><p>Register crop, sowing date, and expected harvest date to view the lifecycle.</p></div>
          )}
          {data.cycles.some((cycle) => cycle._id !== currentCropCycle?._id) && (
            <div className="twin-previous-crops">
              <strong>Other recorded crop cycles</strong>
              {data.cycles
                .filter((cycle) => cycle._id !== currentCropCycle?._id)
                .slice(0, 3)
                .map((cycle) => (
                  <p key={cycle._id}>{cycle.cropName} · {formatDate(cycle.sowingDate)}–{formatDate(cycle.expectedHarvestDate)} · {cycle.currentStage || cycle.growthStage}</p>
                ))}
            </div>
          )}
          <p className="twin-data-note">The expected harvest date is farmer-entered; the timeline is a planning estimate, not sensor-measured crop growth.</p>
        </div>

        <div className="panel">
          <div className="twin-section-heading"><div><h3>Irrigation guidance</h3><p>Forecast + crop stage + available soil context</p></div></div>
          {data.irrigation ? (
            <>
              <span className={`twin-status-pill ${data.irrigation.status === "insufficient-data" ? "twin-tone-muted" : "twin-tone-info"}`}>{data.irrigation.status.replaceAll("-", " ")}</span>
              <p className="twin-irrigation-copy">{data.irrigation.recommendation}</p>
              <p><strong>Suggested timing:</strong> {data.irrigation.recommendedTiming}</p>
              {data.irrigation.missingInputs?.length > 0 && (
                <p className="twin-muted"><strong>Missing:</strong> {data.irrigation.missingInputs.join(", ")}</p>
              )}
              <p className="twin-data-note">{data.irrigation.notes?.join(" ")}</p>
            </>
          ) : <p className="twin-muted">{errors.irrigation || "Irrigation guidance unavailable."}</p>}
          {irrigationChartData.length > 0 && (
            <div className="twin-irrigation-history">
              <strong>Recorded irrigation activities</strong>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={irrigationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9eee9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="quantity" name="Recorded quantity" fill="#4a9b70" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <small>Only farmer-recorded quantities are graphed; units may differ.</small>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="twin-section-heading">
            <div><h3>Soil report</h3><p>SoilGrids values are modelled; lab results remain separate.</p></div>
            {setActivePage && <button type="button" className="secondary-button" onClick={() => setActivePage("Fertilizer & Soil")}>Open soil module</button>}
          </div>
          {latestSoilAssessment ? (
            <>
              <p className="twin-soil-source">{latestSoilAssessment.source === "SoilGrids" ? "Modeled SoilGrids estimates" : "Laboratory test"} · {formatDate(latestSoilAssessment.retrievedAt || latestSoilAssessment.createdAt)}</p>
              <div className="twin-soil-values">
                {[
                  ["pH", "ph"], ["Nitrogen", "nitrogen"], ["Organic carbon", "organicCarbon"],
                  ["Clay", "clay"], ["Sand", "sand"], ["Silt", "silt"], ["CEC", "cec"]
                ].map(([label, key]) => {
                  const parameter = latestSoilAssessment.soilParameters?.[key];
                  return (
                    <div key={key}>
                      <span>{label}</span>
                      <strong>{parameter?.value == null ? "Unavailable" : `${formatNumber(parameter.value, 2)} ${parameter.unit || ""}`}</strong>
                      {parameter?.modelled && <small>Modeled</small>}
                    </div>
                  );
                })}
              </div>
              {data.soilHistory.length > 1 && (
                <div className="twin-previous-crops">
                  <strong>Previous soil reports</strong>
                  {data.soilHistory.slice(1, 4).map((report) => (
                    <p key={report._id}>
                      {formatDate(report.retrievedAt || report.createdAt)} · {report.source === "SoilGrids" ? "Modelled" : "Laboratory"} · pH {formatNumber(report.soilParameters?.ph?.value, 2)}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : <p className="twin-muted">{errors.soilHistory || "No soil report is linked to this farm."}</p>}
        </div>

        <div className="panel twin-weather-detail">
          <div className="twin-section-heading"><div><h3>Weather & 5-day outlook</h3><p>OpenWeather · forecast, not an official warning</p></div></div>
          {weather ? (
            <>
              <div className="twin-weather-facts">
                <span>Humidity <strong>{weather.current.humidityPercent == null ? "Unavailable" : `${weather.current.humidityPercent}%`}</strong></span>
                <span>Rain last hour <strong>{weather.current.rainfallLastHourMm == null ? "Unavailable" : `${formatNumber(weather.current.rainfallLastHourMm, 1)} mm`}</strong></span>
                <span>Wind <strong>{weather.current.windSpeedKph == null ? "Unavailable" : `${formatNumber(weather.current.windSpeedKph)} km/h`}</strong></span>
                <span>Condition <strong>{weather.current.condition?.description || "Unavailable"}</strong></span>
              </div>
              <div className="twin-forecast-list">
                {(weather.daily || []).map((day) => (
                  <div key={day.date}>
                    <strong>{formatDate(day.date)}</strong>
                    <span>{day.condition?.description || "Unavailable"}</span>
                    <small>{day.temperatureMinC == null || day.temperatureMaxC == null
                      ? "Temperature unavailable"
                      : `${formatNumber(day.temperatureMinC)}–${formatNumber(day.temperatureMaxC)}°C`}
                    </small>
                    <small>{day.rainfallMm == null ? "Rain unavailable" : `${formatNumber(day.rainfallMm)} mm forecast`}</small>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="twin-muted">{errors.weather || "Weather and forecast data unavailable."}</p>}
        </div>

        <div className="panel">
          <div className="twin-section-heading"><div><h3>Farm alerts</h3><p>Alerts reflect available forecasts, estimates, and farmer-entered dates.</p></div></div>
          {alerts.length ? (
            <div className="twin-alert-list">
              {alerts.map((alert, index) => (
                <article className={`twin-alert twin-alert-${alert.severity || "info"}`} key={`${alert.type}-${index}`}>
                  <AlertTriangle size={17} />
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.message}</p>
                    <small>{alert.source} · {formatDate(alert.observedAt)}</small>
                    {alert.acknowledgedAt
                      ? <small className="twin-alert-acknowledged">Acknowledged</small>
                      : <button type="button" className="twin-alert-action" onClick={() => acknowledgeAlert(alert)}>Acknowledge</button>}
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="twin-muted">{errors.alerts || "No alerts are available from recent stored data. This does not confirm the farm is risk-free."}</p>}
        </div>
      </section>

      {dataLoading && <div className="twin-loading-inline"><RefreshCw size={14} className="twin-spin" /> Refreshing connected data…</div>}

      {editor && (
        <div className="digital-twin-editor-overlay">
          <FarmSetup
            key={editor.mode === "edit" ? String(editor.farm._id) : "new-farm"}
            embedded
            existingFarm={editor.farm || null}
            createNewFarm={editor.mode === "create"}
            onFarmSaved={handleFarmSaved}
            onCancel={() => setEditor(null)}
          />
        </div>
      )}
      {plotEditor && (
        <div className="digital-twin-editor-overlay">
          <PlotEditor
            key={plotEditor.mode === "edit" ? String(plotEditor.plot._id) : "new-plot"}
            farm={selectedFarm}
            plot={plotEditor.plot || null}
            onCancel={() => setPlotEditor(null)}
            onSaved={handlePlotSaved}
          />
        </div>
      )}
      {showCropEditor && (
        <div className="digital-twin-editor-overlay">
          <CropCycleEditor
            farm={selectedFarm}
            plotId={selectedPlotId}
            onCancel={() => setShowCropEditor(false)}
            onSaved={handleCropSaved}
          />
        </div>
      )}
    </div>
  );
}
