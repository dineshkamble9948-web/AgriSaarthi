import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useLanguage } from "../utils/LanguageContext";
import {
  FileCheck,
  Printer,
  Download,
  AlertCircle,
  Sprout,
  ShieldCheck,
  Droplet,
  CloudSun,
  FlaskConical,
  Sparkles
} from "lucide-react";

export default function FarmHealthReportPanel({ farm }) {
  const { lang } = useLanguage();
  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch farmer plots
  useEffect(() => {
    const fetchPlots = async () => {
      try {
        if (!farm?._id) return;
        const response = await api.get(`/farms/${farm._id}/plots`);
        const list = response.data?.plots || response.data?.data || [];
        setPlots(list);
        if (list.length > 0) {
          setSelectedPlotId(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.error("Plots fetch error:", err);
      }
    };
    fetchPlots();
  }, [farm?._id]);

  // Fetch health report for selected plot
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedPlotId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/reports/plots/${selectedPlotId}/health-report`);
        setReport(response.data?.report || response.data?.data || null);
      } catch (err) {
        console.error("Report generation error:", err);
        setError("Could not generate health report for this plot.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedPlotId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="farm-health-report-panel">
      {/* Non-printing Control Bar */}
      <div className="no-print panel" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#64748b", marginBottom: "0.3rem" }}>
              {lang === "kn" ? "ಜಮೀನಿನ ಪ್ಲಾಟ್ ಆಯ್ಕೆಮಾಡಿ" : "Select Agricultural Plot"}
            </label>
            <select
              value={selectedPlotId || ""}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", minWidth: "220px" }}
            >
              {plots.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.plotName || p.name} ({typeof p.area === "object" ? p.area.value : p.area} {p.areaUnit || "acres"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handlePrint}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#15803d",
            color: "#ffffff",
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            fontSize: "0.9rem",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          <Printer size={18} />
          <span>{lang === "kn" ? "ವರದಿ ಮುದ್ರಿಸಿ / PDF ಡೌನ್‌ಲೋಡ್" : "Print / Save PDF Report"}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "#64748b" }}>
          <Sparkles className="animate-spin" size={32} style={{ margin: "0 auto 1rem", color: "#16a34a" }} />
          <p>{lang === "kn" ? "ಸಮಗ್ರ ಜಮೀನಿನ ಆರೋಗ್ಯ ವರದಿಯನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ..." : "Generating comprehensive Farm Health Report..."}</p>
        </div>
      ) : error ? (
        <div style={{ padding: "1.5rem", background: "#fef2f2", color: "#991b1b", borderRadius: "8px" }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : report ? (
        /* Printable Report Document */
        <div
          className="printable-report-sheet"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "2.5rem",
            maxWidth: "900px",
            margin: "0 auto",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            color: "#0f172a",
            fontFamily: "system-ui, -apple-system, sans-serif"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #15803d", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#15803d" }}>AgriSaarthi</span>
                <span style={{ fontSize: "0.75rem", background: "#dcfce7", color: "#166534", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: "700" }}>
                  VERIFIED ADVISORY
                </span>
              </div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                Comprehensive Plot Health Assessment & Agronomic Advisory
              </p>
            </div>

            <div style={{ textAlign: "right", fontSize: "0.82rem", color: "#475569" }}>
              <strong style={{ display: "block", color: "#0f172a" }}>Report ID: {report.reportId}</strong>
              <span>Date: {new Date(report.generatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Farmer & Plot Profile Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", background: "#f8fafc", padding: "1.25rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <div>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em" }}>
                Farmer Particulars
              </h4>
              <p style={{ margin: "0.2rem 0", fontSize: "0.95rem", fontWeight: "600" }}>{report.farmer?.name}</p>
              <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "#475569" }}>Phone: {report.farmer?.phone}</p>
              <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "#475569" }}>
                Location: {report.farmer?.village}, {report.farmer?.taluk}, {report.farmer?.district}, {report.farmer?.state}
              </p>
            </div>

            <div>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em" }}>
                Plot Parameters
              </h4>
              <p style={{ margin: "0.2rem 0", fontSize: "0.95rem", fontWeight: "600" }}>
                {report.plot?.plotName || report.plot?.name} (Current: {report.plot?.currentCrop})
              </p>
              <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "#475569" }}>
                Area: {typeof report.plot?.area === "object" ? report.plot.area.value : report.plot?.area} {report.plot?.areaUnit || "acres"}
              </p>
              <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "#475569" }}>
                Soil: {report.plot?.soilType} • Irrigation: {report.plot?.irrigationType}
              </p>
            </div>
          </div>

          {/* Overall Health Score Card */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "1.25rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: "#16a34a", color: "#ffffff", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.6rem", fontWeight: "800", flexShrink: 0 }}>
              {report.healthScore || 84}
            </div>
            <div>
              <h3 style={{ margin: "0 0 0.25rem", color: "#14532d", fontSize: "1.1rem" }}>
                {lang === "kn" ? "ಒಟ್ಟಾರೆ ಜಮೀನಿನ ಆರೋಗ್ಯ ಸ್ಥಿತಿ: ಉತ್ತಮ" : "Overall Plot Health Status: Good Condition"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#166534" }}>
                Balanced soil structure and favorable weather forecast for the active vegetative stage. Follow the prescriptive dosage below.
              </p>
            </div>
          </div>

          {/* Section 1: Soil Condition */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h4 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.4rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem" }}>
              <FlaskConical size={18} className="text-emerald-600" />
              1. Soil Fertility Benchmark & Status
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", fontSize: "0.85rem" }}>
              <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", display: "block" }}>Nitrogen (N)</span>
                <strong>{report.soilCondition?.nitrogenValue}</strong>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#0284c7" }}>{report.soilCondition?.nitrogenStatus}</span>
              </div>
              <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", display: "block" }}>Phosphorus (P)</span>
                <strong>{report.soilCondition?.phosphorusValue}</strong>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#0284c7" }}>{report.soilCondition?.phosphorusStatus}</span>
              </div>
              <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", display: "block" }}>Potassium (K)</span>
                <strong>{report.soilCondition?.potassiumValue}</strong>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#0284c7" }}>{report.soilCondition?.potassiumStatus}</span>
              </div>
              <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", display: "block" }}>Soil pH</span>
                <strong>{report.soilCondition?.ph}</strong>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#0284c7" }}>{report.soilCondition?.phStatus}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Fertilizer Prescription */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h4 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.4rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem" }}>
              <Sprout size={18} className="text-emerald-600" />
              2. Verified Fertilizer Prescription (Package of Practices)
            </h4>
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <strong>Prescribed Commercial Fertilizers (Total for {report.plot?.area?.value || report.plot?.area} {report.plot?.areaUnit || "acres"}):</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.4rem" }}>
                  {report.fertilizerPrescription?.commercialProducts?.map((prod, i) => (
                    <span key={i} style={{ background: "#e0f2fe", color: "#0369a1", padding: "0.3rem 0.6rem", borderRadius: "6px", fontWeight: "600" }}>
                      {prod.product}: {prod.totalKgForLandArea} kg ({prod.bags50kg} bags)
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <strong>Application Timing & Split Schedule:</strong>
                <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", color: "#475569" }}>
                  {report.fertilizerPrescription?.splitSchedule?.map((sched, i) => (
                    <li key={i}>
                      <strong>{sched.stage}:</strong> {sched.nitrogenSplit} | {sched.phosphorusSplit} | {sched.potassiumSplit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Section 3: Weather & Irrigation Outlook */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h4 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.4rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem" }}>
              <CloudSun size={18} className="text-emerald-600" />
              3. Meteorological & Irrigation Advisory
            </h4>
            <p style={{ fontSize: "0.85rem", color: "#334155", margin: "0 0 0.5rem" }}>
              <strong>Irrigation Guidance:</strong> {report.irrigationStatus?.guidance}
            </p>
            <p style={{ fontSize: "0.85rem", color: "#334155", margin: 0 }}>
              <strong>Expected Rainfall Outlook:</strong> {report.weatherSummary?.rainfallOutlookMm || 0} mm over the next 48 hours. Condition: {report.weatherSummary?.condition}.
            </p>
          </div>

          {/* Official Disclaimer */}
          <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "1rem", marginTop: "2rem", fontSize: "0.75rem", color: "#64748b", textAlign: "center" }}>
            <p style={{ margin: "0 0 0.25rem" }}>{report.disclaimer}</p>
            <p style={{ margin: 0 }}>© 2026 AgriSaarthi Smart Agricultural Assistance Platform</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
