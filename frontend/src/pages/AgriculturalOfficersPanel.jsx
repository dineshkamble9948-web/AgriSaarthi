import { useState, useEffect } from "react";
import api from "../services/api";
import { useLanguage } from "../utils/LanguageContext";
import {
  PhoneCall,
  MapPin,
  Mail,
  Clock,
  Compass,
  Search,
  Filter,
  Building2,
  Phone,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const KARNATAKA_DISTRICTS = [
  "Raichur",
  "Bengaluru Urban",
  "Mysuru",
  "Belagavi",
  "Kalaburagi",
  "Ballari",
  "Vijayapura",
  "Dharwad"
];

const CATEGORIES = [
  "All",
  "Raitha Samparka Kendra",
  "Krishi Vigyan Kendra",
  "Joint Director of Agriculture",
  "University Extension",
  "Toll-Free Helpline"
];

export default function AgriculturalOfficersPanel({ farm }) {
  const { lang } = useLanguage();
  const [district, setDistrict] = useState(farm?.district || "Raichur");
  const [taluk, setTaluk] = useState("");
  const [category, setCategory] = useState("All");
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOfficers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { district };
        if (taluk) params.taluk = taluk;
        if (category !== "All") params.category = category;

        const response = await api.get("/officers", { params });
        const list = response.data?.officers || response.data?.data || [];
        setOfficers(list);
      } catch (err) {
        console.error("Failed to load agricultural officers:", err);
        setError("Unable to load officer directory. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOfficers();
  }, [district, taluk, category]);

  return (
    <div className="panel officers-panel">
      <div className="panel-header" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <PhoneCall size={24} className="text-emerald-600" />
          {lang === "kn" ? "ಕೃಷಿ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ (RSK)" : "Agricultural Officers & Raitha Samparka Kendra (RSK) Directory"}
        </h2>
        <p style={{ color: "#64748b", margin: "0.25rem 0 0" }}>
          {lang === "kn"
            ? "ನಿಮ್ಮ ತಾಲೂಕಿನ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ (KVK) ವಿಜ್ಞಾನಿಗಳೊಂದಿಗೆ ನೇರ ಸಂಪರ್ಕ."
            : "Connect directly with your local Raitha Samparka Kendra (AAO), KVK Scientists, and Agricultural Officers for field guidance and seed/fertilizer queries."}
        </p>
      </div>

      {/* Toll Free Helpline Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
          color: "#ffffff",
          borderRadius: "12px",
          padding: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}
      >
        <div>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.2)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
            {lang === "kn" ? "ಉಚಿತ ಸಹಾಯವಾಣಿ" : "TOLL-FREE GOVT HELPLINE"}
          </span>
          <h3 style={{ margin: "0.4rem 0 0.2rem", fontSize: "1.2rem", color: "#ffffff" }}>
            Kisan Call Center: 1800-180-1551
          </h3>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
            {lang === "kn"
              ? "ಬೆಳೆ ರಕ್ಷಣೆ, ಹವಾಮಾನ ಮತ್ತು ಕೃಷಿ ಸಮಸ್ಯೆಗಳಿಗೆ 7 ದಿನಗಳೂ (ಬೆಳಿಗ್ಗೆ 6:00 - ರಾತ್ರಿ 10:00) ಲಭ್ಯ."
              : "Direct voice advisory in Kannada & English from agronomists (6:00 AM – 10:00 PM, 365 Days)."}
          </p>
        </div>

        <a
          href="tel:18001801551"
          style={{
            background: "#ffffff",
            color: "#065f46",
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            fontWeight: "700",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9rem"
          }}
        >
          <Phone size={16} />
          {lang === "kn" ? "ಕರೆ ಮಾಡಿ" : "Call Now (Free)"}
        </a>
      </div>

      {/* Filter Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#475569", marginBottom: "0.3rem" }}>
            {lang === "kn" ? "ಜಿಲ್ಲೆ" : "District"}
          </label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#ffffff" }}
          >
            {KARNATAKA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#475569", marginBottom: "0.3rem" }}>
            {lang === "kn" ? "ವಿಭಾಗ / ಪ್ರಕಾರ" : "Category"}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#ffffff" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          <p>{lang === "kn" ? "ಅಧಿಕಾರಿಗಳ ವಿವರಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ..." : "Loading agricultural officers for your location..."}</p>
        </div>
      ) : error ? (
        <div style={{ padding: "1.5rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : officers.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "8px" }}>
          <p>{lang === "kn" ? "ಯಾವುದೇ ಕಚೇರಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ." : "No officers found for the specified district or category."}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {officers.map((officer) => (
            <div
              key={officer.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1.25rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "6px",
                      background: officer.category?.includes("Kendra") ? "#ecfdf5" : "#eff6ff",
                      color: officer.category?.includes("Kendra") ? "#047857" : "#1d4ed8"
                    }}
                  >
                    {officer.category}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "500" }}>
                    {officer.district} {officer.taluk ? `• ${officer.taluk}` : ""}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", margin: "0.25rem 0" }}>
                  {officer.name}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#047857", fontWeight: "600", margin: "0 0 0.5rem" }}>
                  {officer.officerName}
                </p>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.75rem" }}>
                  {officer.designation} • {officer.department}
                </p>

                <div style={{ fontSize: "0.85rem", color: "#475569", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <MapPin size={16} style={{ color: "#94a3b8", flexShrink: 0, marginTop: "2px" }} />
                    <span>{officer.officeAddress}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Clock size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
                    <span>{officer.officeTimings}</span>
                  </div>

                  {officer.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Mail size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
                      <a href={`mailto:${officer.email}`} style={{ color: "#0284c7", textDecoration: "none" }}>
                        {officer.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                <a
                  href={`tel:${officer.mobile || officer.phone}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    textDecoration: "none"
                  }}
                >
                  <Phone size={14} />
                  <span>{officer.mobile || officer.phone}</span>
                </a>

                {officer.directionsUrl && (
                  <a
                    href={officer.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      background: "#f1f5f9",
                      color: "#334155",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      textDecoration: "none"
                    }}
                  >
                    <Compass size={14} />
                    <span>{lang === "kn" ? "ಮಾರ್ಗ" : "Directions"}</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official Directory Provenance */}
      <div style={{ marginTop: "2rem", padding: "1rem", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", fontSize: "0.8rem", color: "#64748b", textAlign: "center" }}>
        <p style={{ margin: "0 0 0.35rem", fontWeight: "600", color: "#334155" }}>
          Official Government Data Provenance: Department of Agriculture, Karnataka (agri.karnataka.gov.in) & ICAR-ATARI
        </p>
        <p style={{ margin: 0, lineHeight: "1.4" }}>
          All contact details represent verified public offices for Raitha Samparka Kendras (RSK) and Krishi Vigyan Kendras (KVK). For immediate 24/7 central government agronomic advisory in Kannada, call the toll-free Kisan Call Center at 1800-180-1551.
        </p>
      </div>
    </div>
  );
}
