
import { useEffect, useState } from "react";
import api from "../services/api";

const initialForm = {
  activityType: "Planting",
  cropName: "",
  date: "",
  quantity: "",
  unit: "",
  cost: "",
  notes: ""
};

export default function FarmHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadRecords = async () => {
    try {
      const response = await api.get("/records");
      setRecords(response.data.records || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load farm records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity || 0),
        cost: Number(form.cost || 0)
      };

      if (editingId) {
        await api.put(`/records/${editingId}`, payload);
      } else {
        await api.post("/records", payload);
      }

      resetForm();
      await loadRecords();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save record.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setEditingId(record._id);
    setForm({
      activityType: record.activityType,
      cropName: record.cropName,
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : "",
      quantity: record.quantity ?? "",
      unit: record.unit || "",
      cost: record.cost ?? "",
      notes: record.notes || ""
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this farm record?")) return;

    try {
      await api.delete(`/records/${id}`);
      if (editingId === id) resetForm();
      await loadRecords();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete record.");
    }
  };

  return (
    <div className="farm-history-page dashboard">
      <div className="panel module-hero">
        <span className="welcome-label">FARM HISTORY</span>
        <h1>Recent Agricultural Records</h1>
        <p>Track planting, irrigation, fertilizers, pesticides and harvest activity.</p>
      </div>

      <form onSubmit={handleSubmit} className="farm-record-form panel">
        <h2>{editingId ? "Edit Farm Activity" : "Add Farm Activity"}</h2>

        <div className="farm-form-grid">
          <div className="farm-input-group">
            <label>Activity Type</label>
            <select name="activityType" value={form.activityType} onChange={handleChange}>
              {[
                "Planting",
                "Fertilizer",
                "Irrigation",
                "Pesticide",
                "Harvest",
                "Other"
              ].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="farm-input-group">
            <label>Crop Name</label>
            <input
              name="cropName"
              value={form.cropName}
              onChange={handleChange}
              placeholder="Example: Paddy, Cotton, Groundnut"
              required
            />
          </div>

          <div className="farm-input-group">
            <label>Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required />
          </div>

          <div className="farm-input-group">
            <label>Quantity</label>
            <input type="number" name="quantity" min="0" step="0.01" value={form.quantity} onChange={handleChange} />
          </div>

          <div className="farm-input-group">
            <label>Unit</label>
            <input name="unit" value={form.unit} onChange={handleChange} placeholder="kg, litres, bags" />
          </div>

          <div className="farm-input-group">
            <label>Cost (₹)</label>
            <input type="number" name="cost" min="0" step="0.01" value={form.cost} onChange={handleChange} />
          </div>
        </div>

        <div className="farm-input-group">
          <label>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Additional details..." />
        </div>

        <div className="record-form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Activity" : "Save Farm Activity"}
          </button>

          {editingId && (
            <button type="button" className="secondary-button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <div className="auth-error">{error}</div>}

      <section className="farm-record-list panel">
        <h2>Farm Activity History</h2>

        {loading ? (
          <p>Loading records...</p>
        ) : records.length === 0 ? (
          <p>No farm activities recorded yet.</p>
        ) : (
          records.map((record) => (
            <article key={record._id} className="farm-record-card">
              <div className="record-card-header">
                <div>
                  <h3>{record.cropName}</h3>
                  <span>{record.activityType}</span>
                </div>
                <strong>₹{Number(record.cost || 0)}</strong>
              </div>

              <p><strong>Date:</strong> {new Date(record.date).toLocaleDateString()}</p>
              <p><strong>Quantity:</strong> {record.quantity || 0} {record.unit || "units"}</p>
              {record.notes && <p><strong>Notes:</strong> {record.notes}</p>}

              <div className="record-actions">
                <button className="secondary-button" onClick={() => handleEdit(record)}>Edit</button>
                <button className="danger-button" onClick={() => handleDelete(record._id)}>Delete</button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
