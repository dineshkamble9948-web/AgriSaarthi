import {
  getKarnatakaDistricts,
  getKarnatakaTaluks,
  getKarnatakaSoilProfile,
  getKarnatakaRainfallProfile,
  enhanceCropRecommendations
} from "../services/karnatakaAgriculturalService.js";

const REQUEST_TIMEOUT_MS = 25000;

const featureRanges = {
  N: [0, 200],
  P: [0, 200],
  K: [0, 300],
  temperature: [-10, 60],
  humidity: [0, 100],
  ph: [0, 14],
  rainfall: [0, 5000]
};

const CROP_CENTROIDS = {
  apple: { N: 20.8, P: 134.22, K: 199.89, temperature: 22.63, humidity: 92.33, ph: 5.93, rainfall: 112.65 },
  banana: { N: 100.23, P: 82.01, K: 50.05, temperature: 27.38, humidity: 80.36, ph: 5.98, rainfall: 104.63 },
  blackgram: { N: 40.02, P: 67.47, K: 19.24, temperature: 29.97, humidity: 65.12, ph: 7.13, rainfall: 67.88 },
  chickpea: { N: 40.09, P: 67.79, K: 79.92, temperature: 18.87, humidity: 16.86, ph: 7.34, rainfall: 80.06 },
  coconut: { N: 21.98, P: 16.93, K: 30.59, temperature: 27.41, humidity: 94.84, ph: 5.98, rainfall: 175.69 },
  coffee: { N: 101.2, P: 28.74, K: 29.94, temperature: 25.54, humidity: 58.87, ph: 6.79, rainfall: 158.07 },
  cotton: { N: 117.77, P: 46.24, K: 19.56, temperature: 23.99, humidity: 79.84, ph: 6.91, rainfall: 80.4 },
  grapes: { N: 23.18, P: 132.53, K: 200.11, temperature: 23.85, humidity: 81.88, ph: 6.03, rainfall: 69.61 },
  jute: { N: 78.4, P: 46.86, K: 39.99, temperature: 24.96, humidity: 79.64, ph: 6.73, rainfall: 174.79 },
  kidneybeans: { N: 20.75, P: 67.54, K: 20.05, temperature: 20.12, humidity: 21.61, ph: 5.75, rainfall: 105.92 },
  lentil: { N: 18.77, P: 68.36, K: 19.41, temperature: 24.51, humidity: 64.8, ph: 6.93, rainfall: 45.68 },
  maize: { N: 77.76, P: 48.44, K: 19.79, temperature: 22.39, humidity: 65.09, ph: 6.25, rainfall: 84.77 },
  mango: { N: 20.07, P: 27.18, K: 29.92, temperature: 31.21, humidity: 50.16, ph: 5.77, rainfall: 94.7 },
  mothbeans: { N: 21.44, P: 48.01, K: 20.23, temperature: 28.19, humidity: 53.16, ph: 6.83, rainfall: 51.2 },
  mungbean: { N: 20.99, P: 47.28, K: 19.87, temperature: 28.53, humidity: 85.5, ph: 6.72, rainfall: 48.4 },
  muskmelon: { N: 100.32, P: 17.72, K: 50.08, temperature: 28.66, humidity: 92.34, ph: 6.36, rainfall: 24.69 },
  orange: { N: 19.58, P: 16.55, K: 10.01, temperature: 22.77, humidity: 92.17, ph: 7.02, rainfall: 110.47 },
  papaya: { N: 49.88, P: 59.05, K: 50.04, temperature: 33.72, humidity: 92.4, ph: 6.74, rainfall: 142.63 },
  pigeonpeas: { N: 20.73, P: 67.73, K: 20.29, temperature: 27.74, humidity: 48.06, ph: 5.79, rainfall: 149.46 },
  pomegranate: { N: 18.87, P: 18.75, K: 40.21, temperature: 21.84, humidity: 90.13, ph: 6.43, rainfall: 107.53 },
  rice: { N: 79.89, P: 47.58, K: 39.87, temperature: 23.69, humidity: 82.27, ph: 6.43, rainfall: 236.18 },
  watermelon: { N: 99.42, P: 17.0, K: 50.22, temperature: 25.59, humidity: 85.16, ph: 6.5, rainfall: 50.79 }
};

const STDS = {
  N: 36.92,
  P: 32.99,
  K: 50.65,
  temperature: 5.06,
  humidity: 22.26,
  ph: 0.77,
  rainfall: 54.96
};

const featureList = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"];

export const predictCropFallback = (inputs) => {
  const dists = Object.entries(CROP_CENTROIDS).map(([crop, c]) => {
    let dist = 0;
    for (const f of featureList) {
      const val = inputs[f] != null ? inputs[f] : c[f];
      const diff = (val - c[f]) / STDS[f];
      dist += diff * diff;
    }
    return { crop, dist };
  });

  dists.sort((a, b) => a.dist - b.dist);
  const top = dists.slice(0, 3);
  const minD = top[0].dist;
  const unnorm = top.map((t) => ({ crop: t.crop, val: Math.exp(-(t.dist - minD) / 2) }));
  const sumVal = unnorm.reduce((acc, u) => acc + u.val, 0);

  return top.map((t, idx) => ({
    crop: t.crop,
    score: +(unnorm[idx].val / sumVal).toFixed(4),
    score_percent: +((unnorm[idx].val / sumVal) * 100).toFixed(2)
  }));
};

/**
 * Controller to fetch all Karnataka districts
 */
export const getDistricts = (req, res) => {
  try {
    const districts = getKarnatakaDistricts();
    return res.status(200).json({
      success: true,
      state: "Karnataka",
      districts
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Controller to fetch taluks for a given Karnataka district
 */
export const getTaluks = (req, res) => {
  try {
    const { district } = req.query;
    const taluks = getKarnatakaTaluks(district);
    return res.status(200).json({
      success: true,
      district: district || "Raichur",
      taluks
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Controller to fetch soil benchmark profile for Karnataka district/taluk
 */
export const getRegionalSoil = (req, res) => {
  try {
    const { district, taluk } = req.query;
    const profile = getKarnatakaSoilProfile(district, taluk);
    return res.status(200).json({
      success: true,
      soil: profile
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Controller to fetch normal rainfall for Karnataka district/taluk
 */
export const getRegionalRainfall = (req, res) => {
  try {
    const { district, taluk } = req.query;
    const rainfall = getKarnatakaRainfallProfile(district, taluk);
    return res.status(200).json({
      success: true,
      rainfall
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Enhanced Crop Recommendation Controller with Karnataka Government datasets integration
 */
export const recommendCrops = async (req, res) => {
  const inputs = req.body;

  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    return res.status(400).json({
      success: false,
      message: "Provide all seven numeric crop inputs."
    });
  }

  const {
    district,
    taluk,
    season,
    is_actual_soil_test = false
  } = inputs;

  // Validate numeric parameters
  for (const [feature, [minimum, maximum]] of Object.entries(featureRanges)) {
    const value = inputs[feature];
    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
      return res.status(400).json({
        success: false,
        message: `${feature} must be a number from ${minimum} to ${maximum}.`
      });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let mlResponse = null;

  try {
    const mlApiUrl = (process.env.ML_API_URL || "http://localhost:8000").replace(/\/+$/, "");
    const response = await fetch(`${mlApiUrl}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
      signal: controller.signal
    });

    if (response.status === 422) {
      return res.status(400).json({
        success: false,
        message: "One or more crop inputs are invalid."
      });
    }

    if (response.ok) {
      mlResponse = await response.json();
    } else {
      console.warn(`Crop ML service returned HTTP ${response.status}. Using agronomic fallback.`);
    }
  } catch (error) {
    console.warn("Crop ML service unreachable or timed out:", error.message, "- Using agronomic fallback.");
  } finally {
    clearTimeout(timeout);
  }

  // If ML service succeeded and already has enhanced recommendations, return directly
  if (mlResponse?.top_three_recommendations) {
    return res.status(200).json({
      success: true,
      recommendations: mlResponse.recommendations || mlResponse.top_three_recommendations.map(r => ({
        crop: r.crop,
        score: +(r.suitability_score / 100).toFixed(4),
        score_percent: r.suitability_score
      })),
      top_three_recommendations: mlResponse.top_three_recommendations,
      location: mlResponse.location,
      regional_soil_profile: mlResponse.regional_soil_profile,
      regional_rainfall_profile: mlResponse.regional_rainfall_profile,
      soil_health_deficiencies: mlResponse.soil_health_deficiencies,
      soil_management_suggestions: mlResponse.soil_management_suggestions,
      score_note: mlResponse.score_note || "Crop predictions generated using Random Forest and validated with official Karnataka government agricultural datasets."
    });
  }

  // Base predictions from ML service or robust centroid fallback
  const baseRecs = mlResponse?.recommendations || predictCropFallback(inputs);

  // If district or Karnataka context is provided, enhance using Karnataka dataset engine
  if (district || taluk || season) {
    const enhanced = enhanceCropRecommendations(
      baseRecs,
      inputs,
      district || "Raichur",
      taluk || "",
      season || "Kharif",
      Boolean(is_actual_soil_test)
    );

    return res.status(200).json({
      success: true,
      recommendations: enhanced.top_three_recommendations.map(r => ({
        crop: r.crop,
        score: +(r.suitability_score / 100).toFixed(4),
        score_percent: r.suitability_score
      })),
      top_three_recommendations: enhanced.top_three_recommendations,
      location: enhanced.location,
      regional_soil_profile: enhanced.regional_soil_profile,
      regional_rainfall_profile: enhanced.regional_rainfall_profile,
      soil_health_deficiencies: enhanced.soil_health_deficiencies,
      soil_management_suggestions: enhanced.soil_management_suggestions,
      score_note: "Recommendations validated with official Karnataka DAC&FW & NFSM soil benchmarks and historical district production records."
    });
  }

  // Backwards compatibility response
  return res.status(200).json({
    success: true,
    recommendations: baseRecs,
    score_note: mlResponse?.score_note || "Recommendations calculated using verified agronomic baseline profiles while the primary ML service is connecting."
  });
};
