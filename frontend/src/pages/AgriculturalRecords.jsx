
import { useEffect, useState } from "react";
import api from "../services/api";

export default function AgriculturalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const initialForm = {
    activityType: "Planting",
    cropName: "",
    date: "",
    quantity: "",
    unit: "",
    cost: "",
    notes: "",
  };

  const [form, setForm] = useState(initialForm);

  const loadRecords = async () => {
    try {
      const response = await api.get("/records");
      setRecords(response.data.records || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load records.");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/records", {
        ...form,
        quantity: Number(form.quantity || 0),
        cost: Number(form.cost || 0),
      });

      setForm(initialForm);
      await loadRecords();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save record.");
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      await api.delete(`/records/${id}`);
      await loadRecords();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete record.");
    }
  };

  return (
    <div className="agricultural-records">
      <h1>Agricultural Records</h1>
      <p>Track your farm activities and expenses.</p>

      <form onSubmit={handleSubmit}>
        <label>Activity Type</label>
        <select
          name="activityType"
          value={form.activityType}
          onChange={handleChange}
        >
          {["Planting", "Fertilizer", "Irrigation", "Pesticide", "Harvest", "Other"].map(
            (type) => <option key={type}>{type}</option>
          )}
        </select>

        <label>Crop Name</label>
        <input
          name="cropName"
          value={form.cropName}
          onChange={handleChange}
          placeholder="e.g. Paddy, Cotton, Groundnut"
          required
        />

        <label>Date</label>
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
        />

        <label>Quantity</label>
        <input
          type="number"
          name="quantity"
          min="0"
          step="0.01"
          value={form.quantity}
          onChange={handleChange}
        />

        <label>Unit</label>
        <input
          name="unit"
          value={form.unit}
          onChange={handleChange}
          placeholder="kg, litres, bags, acres..."
        />

        <label>Cost (₹)</label>
        <input
          type="number"
          name="cost"
          min="0"
          step="0.01"
          value={form.cost}
          onChange={handleChange}
        />

        <label>Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Additional details"
        />

        <button type="submit">Save Record</button>
      </form>

      <h2>Farm Activity History</h2>

      {loading && <p>Loading records...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && records.length === 0 && (
        <p>No records added yet.</p>
      )}

      {records.map((record) => (
        <article key={record._id}>
          <h3>{record.cropName}</h3>
          <p>Activity: {record.activityType}</p>
          <p>Date: {new Date(record.date).toLocaleDateString()}</p>
          <p>Quantity: {record.quantity} {record.unit}</p>
          <p>Cost: ₹{record.cost}</p>
          <p>{record.notes}</p>
          <button onClick={() => deleteRecord(record._id)}>
            Delete
          </button>
        </article>
      ))}
    </div>
  );
}
