import { useState, useEffect } from "react";
import api from "../services/api";
import { useLanguage } from "../utils/LanguageContext";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Sprout,
  AlertTriangle,
  Sparkles,
  Leaf,
  Layers,
  ChevronRight
} from "lucide-react";

const CROPS = [
  { id: "cotton", name: "Cotton", kannada: "ಹತ್ತಿ" },
  { id: "paddy", name: "Paddy (Rice)", kannada: "ಭತ್ತ" },
  { id: "chickpea", name: "Chickpea (Bengal Gram)", kannada: "ಕಡಲೆ" },
  { id: "maize", name: "Maize (Corn)", kannada: "ಮೆಕ್ಕೆಜೋಳ" }
];

export default function FarmingCalendarPanel({ farm }) {
  const { lang } = useLanguage();
  const [selectedCrop, setSelectedCrop] = useState("cotton");
  const [sowingDate, setSowingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const response = await api.get("/calendar", {
          params: { crop: selectedCrop, sowingDate }
        });
        const list = response.data?.tasks || [];
        setTasks(list);
      } catch (err) {
        console.error("Calendar fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, [selectedCrop, sowingDate]);

  const handleToggleTask = async (taskId, currentStatus) => {
    setTogglingId(taskId);
    const newStatus = !currentStatus;

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, isCompleted: newStatus } : t));

    try {
      await api.post("/calendar/toggle", { taskId, isCompleted: newStatus });
    } catch (err) {
      console.error("Task toggle failed:", err);
      // Revert on error
      setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, isCompleted: currentStatus } : t));
    } finally {
      setTogglingId(null);
    }
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="panel farming-calendar-panel">
      <div className="panel-header" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CalendarDays size={24} className="text-emerald-600" />
          {lang === "kn" ? "ಬೆಳೆ ಚಟುವಟಿಕೆಗಳ ವೇಳಾಪಟ್ಟಿ (ಕೃಷಿ ಕ್ಯಾಲೆಂಡರ್)" : "Package of Practices Farming Calendar"}
        </h2>
        <p style={{ color: "#64748b", margin: "0.25rem 0 0" }}>
          {lang === "kn"
            ? "ರಾಯಚೂರು ಕೃಷಿ ವಿವಿ (UAS Raichur) & ICAR ಶಿಫಾರಸು ಮಾಡಿದ ವೈಜ್ಞಾನಿಕ ಹಂತವಾರು ಚಟುವಟಿಕೆಗಳು."
            : "Stage-by-stage agronomic timeline and fertilizer/irrigation interventions based on UAS Raichur & ICAR package of practices."}
        </p>
      </div>

      {/* Controls: Crop and Sowing Date */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem", background: "#f8fafc", padding: "1.25rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "0.4rem" }}>
            {lang === "kn" ? "ಬೆಳೆ ಆಯ್ಕೆಮಾಡಿ" : "Select Target Crop"}
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", background: "#ffffff" }}
          >
            {CROPS.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {lang === "kn" ? `(${c.kannada})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "0.4rem" }}>
            {lang === "kn" ? "ಬಿತ್ತನೆ ದಿನಾಂಕ" : "Sowing Date"}
          </label>
          <input
            type="date"
            value={sowingDate}
            onChange={(e) => setSowingDate(e.target.value)}
            style={{ width: "100%", padding: "0.55rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", background: "#ffffff" }}
          >
          </input>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "0.4rem" }}>
            {lang === "kn" ? "ಪ್ರಗತಿ" : "Practices Completed"}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", height: "42px" }}>
            <div style={{ flex: 1, height: "10px", background: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: "#16a34a", transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#15803d", minWidth: "60px" }}>
              {completedCount} / {tasks.length} ({progressPercent}%)
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          <Sparkles className="animate-spin" size={28} style={{ margin: "0 auto 0.5rem", color: "#16a34a" }} />
          <p>{lang === "kn" ? "ವೇಳಾಪಟ್ಟಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ..." : "Generating agronomic timeline..."}</p>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
          {/* Vertical timeline spine */}
          <div style={{ position: "absolute", left: "28px", top: "15px", bottom: "15px", width: "2px", background: "#cbd5e1" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {tasks.map((task, idx) => {
              const isChecked = task.isCompleted;
              return (
                <div
                  key={task.taskId}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1.25rem",
                    padding: "1rem",
                    background: isChecked ? "#f0fdf4" : "#ffffff",
                    border: "1px solid",
                    borderColor: isChecked ? "#bbf7d0" : "#e2e8f0",
                    borderRadius: "10px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                    transition: "all 0.2s ease"
                  }}
                >
                  {/* Timeline node */}
                  <button
                    onClick={() => handleToggleTask(task.taskId, isChecked)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      zIndex: 1,
                      marginTop: "2px"
                    }}
                    title={isChecked ? "Mark as pending" : "Mark as completed"}
                  >
                    {isChecked ? (
                      <CheckCircle2 size={24} style={{ color: "#16a34a", background: "#ffffff", borderRadius: "50%" }} />
                    ) : (
                      <Circle size={24} style={{ color: "#94a3b8", background: "#ffffff", borderRadius: "50%" }} />
                    )}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: "#f1f5f9",
                            color: "#334155"
                          }}
                        >
                          Day {task.dayOffset}
                        </span>
                        <strong style={{ fontSize: "0.95rem", color: isChecked ? "#15803d" : "#0f172a" }}>
                          {task.stage}
                        </strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Clock size={12} />
                          {task.scheduledDate}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: "600",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "10px",
                            background: task.category === "Fertilizer" ? "#e0e7ff" : task.category === "Sowing" ? "#fef3c7" : "#ecfdf5",
                            color: task.category === "Fertilizer" ? "#3730a3" : task.category === "Sowing" ? "#b45309" : "#065f46"
                          }}
                        >
                          {task.category}
                        </span>
                      </div>
                    </div>

                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem", color: isChecked ? "#475569" : "#334155", lineHeight: "1.4" }}>
                      {task.activity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
