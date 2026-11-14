import mongoose from "mongoose";

const marketPriceSchema = new mongoose.Schema(
  {
    state: { type: String, default: "" },
    district: { type: String, default: "" },
    market: { type: String, default: "" },
    commodity: { type: String, default: "" },
    variety: { type: String, default: "" },
    grade: { type: String, default: "" },
    arrivalDate: { type: String, default: "" },
    minPrice: { type: Number, default: null },
    maxPrice: { type: Number, default: null },
    modalPrice: { type: Number, default: null },
    fetchedAt: { type: String, default: "" },
    dataPoints: { type: Number, default: null }
  },
  { _id: false }
);

const marketPriceCacheSchema = new mongoose.Schema(
  {
    cacheKey: { type: String, required: true, unique: true },
    records: { type: [marketPriceSchema], default: [] },
    fetchedAt: { type: String, default: "" },
    cachedAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

const MarketPriceCache = mongoose.models.MarketPriceCache
  || mongoose.model("MarketPriceCache", marketPriceCacheSchema);

export default MarketPriceCache;
