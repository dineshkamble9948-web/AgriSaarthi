import { useState, useEffect } from "react";
import api from "../services/api";
import { useLanguage } from "../utils/LanguageContext";
import {
  Landmark,
  ExternalLink,
  CheckCircle,
  FileText,
  BadgeIndianRupee,
  Search,
  Filter,
  Sparkles,
  AlertCircle
} from "lucide-react";

const CATEGORIES = [
  "All",
  "Financial Support",
  "Crop Incentive",
  "Water & Irrigation",
  "Insurance & Safety",
  "Equipment & Machinery",
  "Credit & Loans"
];

export default function GovernmentSchemesPanel({ farm }) {
  const { lang } = useLanguage();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (selectedCategory !== "All") params.category = selectedCategory;
        if (farm?._id) params.farmId = farm._id;

        const response = await api.get("/schemes", { params });
        const list = response.data?.schemes || response.data?.data || [];
        setSchemes(list);
      } catch (err) {
        console.error("Schemes fetch error:", err);
        setError("Unable to load government schemes. Please check connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchemes();
  }, [selectedCategory, farm?._id]);

  const filteredSchemes = schemes.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.kannadaName?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="panel government-schemes-panel">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Landmark size={24} className="text-emerald-600" />
            {lang === "kn" ? "ಸರ್ಕಾರಿ ಕೃಷಿ ಯೋಜನೆಗಳು (ಕರ್ನಾಟಕ & ಕೇಂದ್ರ)" : "Government Agricultural Schemes (Karnataka & Central)"}
          </h2>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0" }}>
            {lang === "kn"
              ? "ನಿಮ್ಮ ಜಮೀನು ಮತ್ತು ಬೆಳೆಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಅಧಿಕೃತ ಸಬ್ಸಿಡಿ ಮತ್ತು ಬೆಂಬಲ ಯೋಜನೆಗಳು."
              : "Official state and central subsidy & financial support programs matched to your farm profile."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder={lang === "kn" ? "ಯೋಜನೆ ಹುಡುಕಿ..." : "Search scheme name, crop..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "2.25rem", paddingRight: "0.75rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", padding: "0.75rem 0", margin: "0.5rem 0 1rem" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: selectedCategory === cat ? "#15803d" : "#e2e8f0",
              backgroundColor: selectedCategory === cat ? "#15803d" : "#f8fafc",
              color: selectedCategory === cat ? "#ffffff" : "#475569",
              fontSize: "0.85rem",
              fontWeight: selectedCategory === cat ? "600" : "400",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          <Sparkles className="animate-spin" size={28} style={{ margin: "0 auto 0.5rem", color: "#16a34a" }} />
          <p>{lang === "kn" ? "ಯೋಜನೆಗಳ ವಿವರಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ..." : "Matching official schemes with your farm profile..."}</p>
        </div>
      ) : error ? (
        <div style={{ padding: "1.5rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "8px" }}>
          <p>{lang === "kn" ? "ಯಾವುದೇ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ." : "No schemes found matching the selected filter."}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {filteredSchemes.map((scheme) => {
            const isExpanded = expandedId === scheme.id;
            return (
              <div
                key={scheme.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "12px",
                        backgroundColor: scheme.level?.includes("Karnataka") ? "#e0f2fe" : "#fef3c7",
                        color: scheme.level?.includes("Karnataka") ? "#0369a1" : "#b45309"
                      }}
                    >
                      {scheme.level}
                    </span>

                    {scheme.relevanceScore && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          color: "#15803d",
                          background: "#dcfce7",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem"
                        }}
                      >
                        <CheckCircle size={12} />
                        {scheme.relevanceScore}% Match
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", margin: "0.25rem 0" }}>
                    {scheme.name}
                  </h3>
                  {scheme.kannadaName && (
                    <p style={{ fontSize: "0.85rem", color: "#166534", fontWeight: "500", margin: "0 0 0.5rem" }}>
                      {scheme.kannadaName}
                    </p>
                  )}

                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "0.5rem 0.75rem", borderRadius: "8px", margin: "0.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <BadgeIndianRupee size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
                    <strong style={{ fontSize: "0.85rem", color: "#14532d" }}>
                      {scheme.benefitAmount}
                    </strong>
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.4", margin: "0.5rem 0" }}>
                    {scheme.description}
                  </p>

                  {isExpanded && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <strong style={{ fontSize: "0.8rem", color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Eligibility Criteria:
                        </strong>
                        <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#475569" }}>
                          {scheme.eligibility?.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ marginBottom: "0.75rem" }}>
                        <strong style={{ fontSize: "0.8rem", color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Required Documents:
                        </strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.25rem" }}>
                          {scheme.documents?.map((doc, i) => (
                            <span key={i} style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "#475569" }}>
                              • {doc}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: "0.75rem" }}>
                        <strong style={{ fontSize: "0.8rem", color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          How to Apply:
                        </strong>
                        <p style={{ fontSize: "0.82rem", color: "#475569", margin: "0.25rem 0" }}>
                          {scheme.procedure}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f8fafc" }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : scheme.id)}
                    style={{ background: "none", border: "none", color: "#0284c7", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer", padding: "0" }}
                  >
                    {isExpanded ? (lang === "kn" ? "ಕಡಿಮೆ ವಿವರ" : "View Less") : (lang === "kn" ? "ಹೆಚ್ಚು ವಿವರ ನೋಡಿ" : "View Details")}
                  </button>

                  <a
                    href={scheme.officialWebsite || scheme.officialPortal}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      background: "#16a34a",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      padding: "0.4rem 0.75rem",
                      borderRadius: "6px",
                      textDecoration: "none"
                    }}
                  >
                    <span>{lang === "kn" ? "ಅರ್ಜಿ ಸಲ್ಲಿಸಿ" : "Official Portal"}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Government Provenance and Eligibility Disclaimer */}
      <div style={{ marginTop: "2rem", padding: "1rem", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", fontSize: "0.8rem", color: "#64748b", textAlign: "center" }}>
        <p style={{ margin: "0 0 0.35rem", fontWeight: "600", color: "#334155" }}>
          Official Government Data Provenance: myScheme.gov.in & Karnataka Department of Agriculture (agri.karnataka.gov.in)
        </p>
        <p style={{ margin: 0, lineHeight: "1.4" }}>
          Important Notice: AgriSaarthi provides informative discovery of official schemes based on farmer declarations. Eligibility criteria, application verification, and fund disbursements are strictly administered by respective Government of India and Government of Karnataka departments. We never guarantee financial grant approvals.
        </p>
      </div>
    </div>
  );
}
