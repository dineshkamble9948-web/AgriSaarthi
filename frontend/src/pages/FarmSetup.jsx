
import { useState } from "react";
import { Sprout, MapPin, Ruler, Droplets } from "lucide-react";
import api from "../services/api";

export default function FarmSetup({ onFarmSaved }) {
  const [form, setForm] = useState({
    farmName: "",
    location: "",
    state: "Karnataka",
    area: "",
    areaUnit: "acres",
    soilType: "Red",
    ph: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    waterSource: "Borewell"
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/farms", {
        ...form,
        area: Number(form.area),
        ph: form.ph === "" ? null : Number(form.ph),
        nitrogen: form.nitrogen === "" ? null : Number(form.nitrogen),
        phosphorus: form.phosphorus === "" ? null : Number(form.phosphorus),
        potassium: form.potassium === "" ? null : Number(form.potassium)
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
    <div className="farm-setup-page">

      <form className="farm-setup-card" onSubmit={handleSubmit}>

        <div className="farm-setup-logo">
          <Sprout size={26} />
          <strong>AgriSaarthi</strong>
        </div>

        <span className="welcome-label">YOUR FARM PROFILE</span>

        <h1>Let's set up your farm</h1>

        <p className="farm-setup-description">
          Enter your farm information to receive personalized
          agricultural recommendations.
        </p>

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
            <label>Village / City *</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Enter your farm location"
              required
            />
          </div>

          <div className="farm-input-group">
            <label>State</label>
            <input
              name="state"
              value={form.state}
              onChange={handleChange}
              required
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

        </div>

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

        <button
          type="submit"
          className="auth-submit"
          disabled={loading}
        >
          {loading ? "Saving Farm..." : "Save Farm & Continue"}
          <MapPin size={18} />
        </button>

      </form>

    </div>
  );
}
