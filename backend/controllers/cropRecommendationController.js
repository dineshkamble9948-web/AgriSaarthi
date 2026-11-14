const REQUEST_TIMEOUT_MS = 10000;

const featureRanges = {
  N: [0, 200],
  P: [0, 200],
  K: [0, 300],
  temperature: [-10, 60],
  humidity: [0, 100],
  ph: [0, 14],
  rainfall: [0, 5000]
};

export const recommendCrops = async (req, res) => {
  const inputs = req.body;

  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    return res.status(400).json({
      success: false,
      message: "Provide all seven numeric crop inputs."
    });
  }

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

    if (!response.ok) {
      console.error(`Crop ML service returned HTTP ${response.status}.`);
      return res.status(502).json({
        success: false,
        message: "Crop recommendation service is temporarily unavailable."
      });
    }

    const result = await response.json();
    return res.status(200).json({
      success: true,
      recommendations: result.recommendations,
      score_note: result.score_note
    });
  } catch (error) {
    console.error("Crop recommendation service request failed:", error.message);
    return res.status(502).json({
      success: false,
      message: "Crop recommendation service is temporarily unavailable."
    });
  } finally {
    clearTimeout(timeout);
  }
};
