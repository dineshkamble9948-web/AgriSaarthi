import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Leaf,
  MapPin,
  RefreshCw,
  Sprout
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api from "../services/api";

const EMPTY_COORDINATES = { latitude: "", longitude: "" };
const NUTRIENTS = [
  { key: "nitrogen", label: "Nitrogen (N)" },
  { key: "phosphorus", label: "Phosphorus (P)" },
  { key: "potassium", label: "Potassium (K)" }
];
const CROPS = [
  "Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Groundnut",
  "Chickpea", "Tomato", "Potato", "Onion", "Millet", "Other"
];
const LAB_STATUSES = [
  ["unknown", "Not interpreted"],
  ["low", "Low"],
  ["medium", "Medium"],
  ["adequate", "Adequate"],
  ["high", "High"]
];
const SOIL_PARAMETERS = [
  { key: "ph", label: "Soil pH", icon: "pH" },
  { key: "nitrogen", label: "Nitrogen", icon: "N" },
  { key: "organicCarbon", label: "Organic carbon", icon: "C" },
  { key: "clay", label: "Clay", icon: "Cl" },
  { key: "sand", label: "Sand", icon: "Sa" },
  { key: "silt", label: "Silt", icon: "Si" },
  { key: "cec", label: "Cation exchange capacity", icon: "CEC" }
];
const SOIL_PARAMETER_LABELS = Object.fromEntries(
  SOIL_PARAMETERS.map((parameter) => [parameter.key, parameter.label])
);

const displayNumber = (value) => (
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
    : "Unavailable"
);

const pHCondition = (value) => {
  if (!Number.isFinite(value)) return null;
  if (value < 5.5) return { label: "Acidic", tone: "warning" };
  if (value > 7.5) return { label: "Alkaline", tone: "warning" };
  return { label: "Near neutral", tone: "good" };
};

const soilLocation = (assessment) => (
  `${Number(assessment.location.latitude).toFixed(4)}, ${Number(assessment.location.longitude).toFixed(4)}`
);

export default function SoilIntelligence({ farm = null }) {
  const [coordinates, setCoordinates] = useState(() => ({
    latitude: farm?.latitude != null ? String(farm.latitude) : "",
    longitude: farm?.longitude != null ? String(farm.longitude) : ""
  }));
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const [crop, setCrop] = useState("Rice");
  const [otherCrop, setOtherCrop] = useState("");
  const [soilPh, setSoilPh] = useState(() => (farm?.ph != null ? String(farm.ph) : ""));
  const [npkUnit, setNpkUnit] = useState("kg/ha");
  const [npkValues, setNpkValues] = useState(() => ({
    nitrogen: farm?.nitrogen != null ? String(farm.nitrogen) : "",
    phosphorus: farm?.phosphorus != null ? String(farm.phosphorus) : "",
    potassium: farm?.potassium != null ? String(farm.potassium) : ""
  }));
  const [npkStatuses, setNpkStatuses] = useState({
    nitrogen: "unknown",
    phosphorus: "unknown",
    potassium: "unknown"
  });

  useEffect(() => {
    let active = true;
    api.get("/soil/history")
      .then(({ data }) => {
        const records = Array.isArray(data.history) ? data.history : [];
        if (!active) return;
        setHistory(records);
        const latestSoil = records.find((item) => item.source === "SoilGrids");
        if (latestSoil) {
          setAssessment(latestSoil);
          setCoordinates({
            latitude: String(latestSoil.location.latitude),
            longitude: String(latestSoil.location.longitude)
          });
        } else if (farm?.latitude != null && farm?.longitude != null) {
          setCoordinates({
            latitude: String(farm.latitude),
            longitude: String(farm.longitude)
          });
        }
        setRecommendation(latestSoil?.fertilizerRecommendation || null);
      })
      .catch((error) => {
        if (active) {
          setHistoryError(error.response?.data?.message || "Could not load saved soil assessments.");
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const compositionData = useMemo(() => (
    ["clay", "sand", "silt"].map((key) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: assessment?.soilParameters?.[key]?.value
    })).filter((item) => typeof item.value === "number" && Number.isFinite(item.value))
  ), [assessment]);

  const handleCoordinateChange = (event) => {
    setCoordinates((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const lookupSoil = async (event) => {
    event.preventDefault();
    setLookupLoading(true);
    setLookupError("");
    try {
      const { data } = await api.post("/soil/lookup", {
        latitude: Number(coordinates.latitude),
        longitude: Number(coordinates.longitude)
      });
      setAssessment(data.assessment);
      setHistory((current) => [
        data.assessment,
        ...current.filter((item) => item._id !== data.assessment._id)
      ]);
      setRecommendation(data.assessment.fertilizerRecommendation || null);
    } catch (error) {
      setLookupError(error.response?.data?.message || "Soil data is unavailable. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const submitRecommendation = async (event) => {
    event.preventDefault();
    if (coordinates.latitude === "" || coordinates.longitude === "") {
      setRecommendationError("Enter this farm's latitude and longitude before requesting fertilizer guidance.");
      return;
    }
    setRecommendationLoading(true);
    setRecommendationError("");
    try {
      const { data } = await api.post("/soil/recommendations", {
        latitude: Number(coordinates.latitude),
        longitude: Number(coordinates.longitude),
        assessmentId: assessment?._id,
        crop: crop === "Other" ? otherCrop : crop,
        soilPh: soilPh === "" ? null : Number(soilPh),
        laboratoryNPK: {
          unit: npkUnit,
          nitrogen: Number(npkValues.nitrogen),
          phosphorus: Number(npkValues.phosphorus),
          potassium: Number(npkValues.potassium),
          status: npkStatuses
        }
      });
      setAssessment(data.assessment);
      setRecommendation(data.recommendation);
      setHistory((current) => [
        data.assessment,
        ...current.filter((item) => item._id !== data.assessment._id)
      ]);
    } catch (error) {
      setRecommendationError(
        error.response?.data?.message || "Could not create a fertilizer recommendation."
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  const loadAssessment = (item) => {
    setAssessment(item);
    setCoordinates({
      latitude: String(item.location.latitude),
      longitude: String(item.location.longitude)
    });
    setRecommendation(item.fertilizerRecommendation || null);
    if (item.selectedCrop) {
      setCrop(CROPS.includes(item.selectedCrop) ? item.selectedCrop : "Other");
      if (!CROPS.includes(item.selectedCrop)) setOtherCrop(item.selectedCrop);
    }
    if (item.laboratoryNPK) {
      setNpkUnit(item.laboratoryNPK.unit || "kg/ha");
      setNpkValues({
        nitrogen: String(item.laboratoryNPK.nitrogen ?? ""),
        phosphorus: String(item.laboratoryNPK.phosphorus ?? ""),
        potassium: String(item.laboratoryNPK.potassium ?? "")
      });
      setNpkStatuses(item.laboratoryNPK.status || {
        nitrogen: "unknown",
        phosphorus: "unknown",
        potassium: "unknown"
      });
    }
  };

  return (
    <div className="soil-intelligence">
      <section className="panel soil-location-panel">
        <div className="soil-section-heading">
          <div className="soil-section-icon"><MapPin size={19} /></div>
          <div>
            <h3>Analyze a farm location</h3>
            <p>Enter coordinates to retrieve the SoilGrids modelled surface-soil estimates (0–5 cm).</p>
          </div>
        </div>
        <form className="soil-coordinate-form" onSubmit={lookupSoil}>
          <label>
            Latitude
            <input
              name="latitude"
              type="number"
              min="-90"
              max="90"
              step="any"
              value={coordinates.latitude}
              onChange={handleCoordinateChange}
              placeholder="e.g. 12.9716"
              required
            />
          </label>
          <label>
            Longitude
            <input
              name="longitude"
              type="number"
              min="-180"
              max="180"
              step="any"
              value={coordinates.longitude}
              onChange={handleCoordinateChange}
              placeholder="e.g. 77.5946"
              required
            />
          </label>
          <button className="primary-button soil-lookup-button" type="submit" disabled={lookupLoading}>
            {lookupLoading ? <><RefreshCw size={16} className="soil-spin" /> Retrieving soil...</> : "Analyze soil"}
          </button>
        </form>
        {lookupError && (
          <div className="soil-inline-error" role="alert">
            <AlertCircle size={17} /> <span>{lookupError}</span>
          </div>
        )}
      </section>

      <div className="soil-source-note" role="note">
        <AlertCircle size={17} />
        <p>
          SoilGrids values are <strong>modelled estimates, not laboratory measurements</strong>.
          In particular, SoilGrids nitrogen and organic carbon are not laboratory NPK results.
          Confirm decisions with a local soil test.
        </p>
      </div>

      {assessment?.source === "SoilGrids" ? (
        <>
          <section className="soil-results-heading">
            <div>
              <span className="welcome-label">SOIL PROFILE</span>
              <h2>Soil health at {soilLocation(assessment)}</h2>
              <p>
                {assessment.retrievedAt
                  ? `Retrieved ${new Date(assessment.retrievedAt).toLocaleString()}`
                  : "Laboratory report"}
                {" · "}
                {assessment.source === "SoilGrids" ? "SoilGrids · 0–5 cm" : "Laboratory data"}
              </p>
            </div>
            {assessment.source === "SoilGrids" && (
              <span className="soil-model-badge"><Sprout size={14} /> Modelled estimates</span>
            )}
          </section>

          <section className="soil-parameter-grid" aria-label="Soil parameters">
            {SOIL_PARAMETERS.map((parameter) => {
              const reading = assessment.soilParameters?.[parameter.key];
              const condition = parameter.key === "ph" ? pHCondition(reading?.value) : null;
              return (
                <article className={`panel soil-parameter-card soil-parameter-${parameter.key}`} key={parameter.key}>
                  <div className="soil-parameter-top">
                    <span className="soil-parameter-icon">{parameter.icon}</span>
                    {condition && (
                      <span className={`soil-condition soil-condition-${condition.tone}`}>
                        {condition.label}
                      </span>
                    )}
                  </div>
                  <span className="soil-parameter-label">{parameter.label}</span>
                  <strong className="soil-parameter-value">
                    {displayNumber(reading?.value)}
                    {reading?.value !== null && reading?.value !== undefined && (
                      <small>{reading.unit}</small>
                    )}
                  </strong>
                  <span className="soil-parameter-depth">
                    {reading?.value === null || reading?.value === undefined
                      ? "No value returned"
                      : `${reading.depth} depth · modelled`}
                  </span>
                </article>
              );
            })}
          </section>

          <div className="soil-analysis-grid">
            <section className="panel soil-chart-panel">
              <div className="soil-panel-heading">
                <div>
                  <h3>Soil texture</h3>
                  <p>Estimated particle composition by mass</p>
                </div>
                <span>%</span>
              </div>
              {compositionData.length ? (
                <div className="soil-chart">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={compositionData} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 10 }}>
                      <CartesianGrid stroke="#e8eee8" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`${displayNumber(Number(value))}%`, "Modelled estimate"]} />
                      <Bar dataKey="value" fill="#588b62" radius={[0, 5, 5, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="soil-empty-note">Texture data was not returned for this location.</p>
              )}
              <p className="soil-chart-caption">Individual estimates are shown as returned; a missing fraction is not inferred.</p>
            </section>

            <section className="panel soil-summary-panel">
              <div className="soil-panel-heading">
                <div>
                  <h3>Soil summary</h3>
                  <p>Use as a screening view, not a fertilizer prescription.</p>
                </div>
                <Leaf size={19} />
              </div>
              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    {assessment.soilParameters?.ph?.value == null
                      ? "SoilGrids did not return pH for this point."
                      : `Modelled pH is ${displayNumber(assessment.soilParameters.ph.value)}; crop-specific suitability depends on local conditions.`}
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    {assessment.soilParameters?.organicCarbon?.value == null
                      ? "Organic carbon is unavailable in this response."
                      : `Modelled organic carbon is ${displayNumber(assessment.soilParameters.organicCarbon.value)} g/kg; it is not an organic-matter laboratory report.`}
                  </span>
                </li>
                <li>
                  <FlaskConical size={16} />
                  <span>Use laboratory-tested N, P, and K values and their lab interpretation for fertilizer decisions.</span>
                </li>
              </ul>
            </section>
          </div>
          {assessment.missingProperties?.length > 0 && (
            <p className="soil-missing-note" role="status">
              SoilGrids did not return: {assessment.missingProperties
                .map((key) => SOIL_PARAMETER_LABELS[key] || key)
                .join(", ")}. Missing values are not estimated by this app.
            </p>
          )}
        </>
      ) : (
        <section className="panel soil-empty-state">
          {lookupLoading ? (
            <><RefreshCw size={22} className="soil-spin" /><strong>Requesting SoilGrids data...</strong></>
          ) : historyLoading ? (
            <><RefreshCw size={22} className="soil-spin" /><strong>Loading saved assessments...</strong></>
          ) : (
            <>
              <div className="soil-empty-icon"><MapPin size={24} /></div>
              <strong>No soil profile selected</strong>
              <p>Enter the latitude and longitude of your farm to see available SoilGrids estimates.</p>
            </>
          )}
        </section>
      )}

      <section className="panel soil-fertilizer-panel">
        <div className="soil-section-heading">
          <div className="soil-section-icon soil-fertilizer-icon"><FlaskConical size={19} /></div>
          <div>
            <h3>Fertilizer intelligence</h3>
            <p>Use your laboratory report, including the lab's own nutrient status interpretation.</p>
          </div>
        </div>
        <form className="soil-lab-form" onSubmit={submitRecommendation}>
          <label>
            Selected crop
            <select value={crop} onChange={(event) => setCrop(event.target.value)} required>
              {CROPS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {crop === "Other" && (
            <label>
              Crop name
              <input value={otherCrop} onChange={(event) => setOtherCrop(event.target.value)} maxLength={60} required />
            </label>
          )}
          <label>
            Soil pH (laboratory result, optional)
            <input
              type="number"
              min="0"
              max="14"
              step="any"
              value={soilPh}
              onChange={(event) => setSoilPh(event.target.value)}
              placeholder="0–14"
            />
          </label>
          <label>
            NPK unit from the report
            <select value={npkUnit} onChange={(event) => setNpkUnit(event.target.value)}>
              <option value="kg/ha">kg/ha</option>
              <option value="mg/kg">mg/kg</option>
            </select>
          </label>
          {NUTRIENTS.map((nutrient) => (
            <div className="soil-lab-nutrient" key={nutrient.key}>
              <label>
                {nutrient.label} lab value
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="any"
                  value={npkValues[nutrient.key]}
                  onChange={(event) => setNpkValues((current) => ({
                    ...current,
                    [nutrient.key]: event.target.value
                  }))}
                  required
                />
              </label>
              <label>
                Lab interpretation
                <select
                  value={npkStatuses[nutrient.key]}
                  onChange={(event) => setNpkStatuses((current) => ({
                    ...current,
                    [nutrient.key]: event.target.value
                  }))}
                >
                  {LAB_STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          <p className="soil-lab-note">
            Lab units and low/medium/adequate/high categories depend on the test method and region. Enter the report's own values and interpretation; this app does not infer deficiency from SoilGrids or prescribe a dose.
          </p>
          {recommendationError && (
            <div className="soil-inline-error" role="alert">
              <AlertCircle size={17} /> <span>{recommendationError}</span>
            </div>
          )}
          <button className="primary-button" type="submit" disabled={recommendationLoading}>
            {recommendationLoading ? "Preparing guidance..." : "Get fertilizer guidance"}
          </button>
        </form>

        {recommendation && (
          <div className="soil-recommendation-results" aria-live="polite">
            <div className="soil-panel-heading">
              <div>
                <h3>Guidance for {recommendation.crop}</h3>
                <p>Based on the lab's stated nutrient classes</p>
              </div>
              <ClipboardList size={19} />
            </div>
            <div className="soil-recommendation-list">
              {recommendation.actions?.map((action) => (
                <article className="soil-recommendation-item" key={action.nutrient}>
                  <div>
                    <strong>{action.nutrient}</strong>
                    <span className={`soil-status-tag soil-status-${recommendation.nutrientStatuses?.[action.nutrient.toLowerCase().split(" ")[0]] || "unknown"}`}>
                      {action.status}
                    </span>
                  </div>
                  {action.fertilizerTypes?.length > 0 && (
                    <p><b>Fertilizer types:</b> {action.fertilizerTypes.join(" or ")}</p>
                  )}
                  <p>{action.guidance}</p>
                  <small>Dosage: not provided</small>
                </article>
              ))}
            </div>
            {recommendation.verifiedPackageOfPractices && (
              <div style={{ marginTop: "1.25rem", padding: "1.25rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <div>
                    <h4 style={{ margin: "0 0 0.25rem", color: "#14532d", fontSize: "1.05rem" }}>
                      Verified Agronomic Package of Practices (POP) Dosage
                    </h4>
                    <span style={{ fontSize: "0.78rem", color: "#166534", fontWeight: "600" }}>
                      Official Guidelines: {recommendation.verifiedPackageOfPractices.source}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: "#dcfce7", color: "#15803d", padding: "0.2rem 0.6rem", borderRadius: "12px", fontWeight: "700" }}>
                    OFFICIAL EXTENSION DATA
                  </span>
                </div>

                {recommendation.verifiedPackageOfPractices.commercialProducts?.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <strong style={{ fontSize: "0.85rem", color: "#166534", display: "block", marginBottom: "0.4rem" }}>
                      Commercial Fertilizer Requirements ({recommendation.verifiedPackageOfPractices.acreage} {recommendation.verifiedPackageOfPractices.acreageUnit || "acres"}):
                    </strong>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                      {recommendation.verifiedPackageOfPractices.commercialProducts.map((prod, idx) => (
                        <div key={idx} style={{ background: "#ffffff", padding: "0.75rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                          <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>{prod.product}</span>
                          <strong style={{ fontSize: "1.05rem", color: "#15803d", display: "block" }}>{prod.totalKgForLandArea} kg</strong>
                          <small style={{ fontSize: "0.75rem", color: "#0369a1" }}>≈ {prod.bags50kg} bags (50kg)</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recommendation.verifiedPackageOfPractices.splitSchedule?.length > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong style={{ fontSize: "0.85rem", color: "#166534", display: "block", marginBottom: "0.3rem" }}>
                      Recommended Split Application Timings:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "#334155" }}>
                      {recommendation.verifiedPackageOfPractices.splitSchedule.map((s, idx) => (
                        <li key={idx} style={{ marginBottom: "0.25rem" }}>
                          <strong>{s.stage}:</strong> {s.nitrogenSplit} | {s.phosphorusSplit} | {s.potassiumSplit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem" }}>
                  Note: Verified dosage applies to standard medium-fertility soils. For saline or highly alkaline soils, consult your local Raitha Samparka Kendra (RSK).
                </p>
              </div>
            )}

            {recommendation.soilImprovements?.length > 0 && (
              <div className="soil-improvements">
                <strong>Soil improvement suggestions</strong>
                {recommendation.soilImprovements.map((suggestion) => <p key={suggestion}>{suggestion}</p>)}
              </div>
            )}
            <p className="soil-lab-note">{recommendation.dosageNote}</p>
          </div>
        )}
      </section>

      <section className="panel soil-history-panel">
        <div className="soil-panel-heading">
          <div>
            <h3>Recent soil assessments</h3>
            <p>Saved privately to your farmer account</p>
          </div>
        </div>
        {historyError && <p className="soil-inline-error" role="status">{historyError}</p>}
        {historyLoading ? (
          <p className="soil-empty-note">Loading assessment history...</p>
        ) : history.length ? (
          <div className="soil-history-list">
            {history.slice(0, 8).map((item) => (
              <button
                className={`soil-history-item ${assessment?._id === item._id ? "selected" : ""}`}
                key={item._id}
                type="button"
                onClick={() => loadAssessment(item)}
              >
                <span className="soil-history-icon"><Sprout size={16} /></span>
                <span className="soil-history-copy">
                  <strong>{item.selectedCrop || "Soil profile"}</strong>
                  <small>{soilLocation(item)} · {item.source === "SoilGrids" ? "SoilGrids estimate" : "Lab report"}</small>
                </span>
                <span className="soil-history-date">
                  {new Date(item.retrievedAt || item.createdAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="soil-empty-note">Saved assessments will appear here.</p>
        )}
      </section>
    </div>
  );
}
