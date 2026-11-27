const RAIN_TO_DEFER_MM = 8;
const RAIN_TO_CHECK_MM = 2;
const HIGH_RAIN_PROBABILITY = 70;
const MODERATE_RAIN_PROBABILITY = 30;

// Verified ICAR-IIWM & FAO-56 Crop Evapotranspiration Coefficients (Kc)
const FAO56_KC_STANDARDS = {
  "cotton": {
    initial: 0.45,
    vegetative: 0.75,
    flowering: 1.15,
    boll: 1.15,
    maturity: 0.65,
    totalWaterMm: "650-800 mm",
    criticalStages: ["Square Initiation", "Peak Flowering", "Boll Development"],
    guidance: "In Vertisols (Black soil), adopt alternate furrow irrigation to save 30% water. Withhold irrigation when 30-40% bolls have opened."
  },
  "paddy": {
    initial: 1.10,
    vegetative: 1.15,
    flowering: 1.30,
    heading: 1.30,
    maturity: 0.95,
    totalWaterMm: "1100-1350 mm",
    criticalStages: ["Transplanting Establishment", "Panicle Initiation", "Flowering"],
    guidance: "Adopt Alternate Wetting and Drying (AWD) after tillering. Re-irrigate when water drops 15 cm below soil surface. Drain completely 10-12 days before harvest."
  },
  "rice": {
    initial: 1.10,
    vegetative: 1.15,
    flowering: 1.30,
    heading: 1.30,
    maturity: 0.95,
    totalWaterMm: "1100-1350 mm",
    criticalStages: ["Transplanting Establishment", "Panicle Initiation", "Flowering"],
    guidance: "Adopt Alternate Wetting and Drying (AWD) after tillering. Re-irrigate when water drops 15 cm below soil surface. Drain completely 10-12 days before harvest."
  },
  "maize": {
    initial: 0.40,
    vegetative: 0.80,
    flowering: 1.20,
    silking: 1.20,
    maturity: 0.60,
    totalWaterMm: "500-650 mm",
    criticalStages: ["Tasseling", "Silking", "Cob Filling"],
    guidance: "Prevent moisture stress at tasseling and silking to avoid poor pollination and blank tips."
  },
  "chickpea": {
    initial: 0.40,
    vegetative: 0.65,
    flowering: 0.95,
    pod: 1.00,
    maturity: 0.35,
    totalWaterMm: "250-350 mm",
    criticalStages: ["Pre-Flowering Branching", "Pod Development"],
    guidance: "In residual moisture black soils, one protective irrigation at pod development stage increases yield by 35%. Avoid flood irrigation during active flowering."
  }
};

const getAgronomicWaterProfile = (cropName, stageName) => {
  const cropKey = String(cropName || "").toLowerCase().trim();
  const matchedCrop = FAO56_KC_STANDARDS[cropKey] || FAO56_KC_STANDARDS["cotton"];
  const stageKey = String(stageName || "").toLowerCase().trim();

  let kc = 0.80; // default moderate
  let isCritical = false;

  if (stageKey.includes("flower") || stageKey.includes("boll") || stageKey.includes("panicle") || stageKey.includes("silk") || stageKey.includes("pod")) {
    kc = matchedCrop.flowering || matchedCrop.mid || 1.15;
    isCritical = true;
  } else if (stageKey.includes("sow") || stageKey.includes("initial") || stageKey.includes("germin")) {
    kc = matchedCrop.initial || 0.45;
  } else if (stageKey.includes("matur") || stageKey.includes("harvest")) {
    kc = matchedCrop.maturity || 0.65;
  } else {
    kc = matchedCrop.vegetative || 0.80;
  }

  return {
    cropCoefficientKc: kc,
    isCriticalStage: isCritical,
    criticalStagesList: matchedCrop.criticalStages,
    totalSeasonalWaterDemand: matchedCrop.totalWaterMm,
    scientificPractice: matchedCrop.guidance,
    methodology: "ICAR-IIWM & FAO-56 Crop Evapotranspiration Standards (ETc = ETo * Kc)"
  };
};

const soilTextureContext = (soilAssessment) => {
  const parameters = soilAssessment?.soilParameters || {};
  const sand = parameters.sand?.value;
  const clay = parameters.clay?.value;
  const estimatesAreModelled = parameters.sand?.modelled === true
    || parameters.clay?.modelled === true;

  if (Number.isFinite(sand) && sand >= 70) {
    return {
      summary: "Available soil data suggests a coarse, sand-dominant texture; check the root zone more frequently for drying.",
      source: estimatesAreModelled ? "SoilGrids modelled texture" : soilAssessment.source
    };
  }
  if (Number.isFinite(clay) && clay >= 40) {
    return {
      summary: "Available soil data suggests a clay-dominant texture; check field conditions carefully and avoid waterlogging.",
      source: estimatesAreModelled ? "SoilGrids modelled texture" : soilAssessment.source
    };
  }
  if (soilAssessment?.source === "SoilGrids") {
    return {
      summary: "SoilGrids texture estimates are available, but they do not measure current soil moisture.",
      source: "SoilGrids modelled texture"
    };
  }
  if (soilAssessment?.source === "laboratory-test") {
    return {
      summary: "A laboratory soil report is linked, but it does not provide a current soil-moisture reading.",
      source: "Laboratory soil report"
    };
  }
  return {
    summary: "No linked soil report is available to inform soil-water behavior.",
    source: null
  };
};

const stageGuidance = (cropCycle) => {
  if (!cropCycle) {
    return "Add the current crop and growth stage for crop-aware guidance.";
  }
  const stage = cropCycle.currentStage || cropCycle.growthStage;
  if (stage === "Flowering") {
    return `${cropCycle.cropName} is in the ${stage} stage; confirm the crop-specific local irrigation schedule and avoid moisture stress.`;
  }
  if (stage === "Germination" || stage === "Vegetative Growth") {
    return `${cropCycle.cropName} is in the ${stage} stage; inspect the active root zone and follow the local crop schedule.`;
  }
  return `${cropCycle.cropName} is in the ${stage || "unavailable"} stage; use its local crop-specific water schedule.`;
};

export const createIrrigationRecommendation = ({
  cropCycle,
  weather,
  weatherError = "",
  soilAssessment = null,
  soilType = ""
}) => {
  const missingInputs = [];
  if (!cropCycle) missingInputs.push("Current crop and growth stage");
  if (!weather) missingInputs.push("Current weather forecast");

  const hourly = Array.isArray(weather?.hourly) ? weather.hourly : [];
  const rainfallValues = hourly
    .map((hour) => hour.rainfallMm)
    .filter(Number.isFinite);
  const probabilityValues = hourly
    .map((hour) => hour.precipitationProbabilityPercent)
    .filter(Number.isFinite);
  const rainfallNext24HoursMm = rainfallValues.length
    ? rainfallValues.reduce((total, value) => total + Math.max(0, value), 0)
    : null;
  const precipitationProbabilityPercent = probabilityValues.length
    ? Math.max(...probabilityValues)
    : null;
  const forecastAvailable = rainfallNext24HoursMm !== null
    || precipitationProbabilityPercent !== null;
  if (weather && !forecastAvailable) {
    missingInputs.push("24-hour rainfall forecast");
  }
  const soilContext = soilTextureContext(soilAssessment);
  const evidence = [];
  if (weather && forecastAvailable) {
    evidence.push(rainfallNext24HoursMm === null
      ? "Forecast rainfall amount is unavailable."
      : `OpenWeather forecast rainfall for the next 24 hours: ${rainfallNext24HoursMm.toFixed(1)} mm.`);
    evidence.push(precipitationProbabilityPercent === null
      ? "Forecast precipitation probability is unavailable."
      : `Highest forecast precipitation probability: ${precipitationProbabilityPercent}%.`);
  }
  if (cropCycle) {
    evidence.push(`Crop stage: ${cropCycle.currentStage || cropCycle.growthStage} (${cropCycle.stageSource || "recorded"}).`);
  }
  if (soilContext.source) {
    evidence.push(soilContext.summary);
  }

  let status = "insufficient-data";
  let recommendedTiming = "Reassess when the missing inputs are available.";
  let recommendation = "No irrigation decision can be made from the available information.";

  if (weather && cropCycle && forecastAvailable) {
    if (
      (rainfallNext24HoursMm !== null && rainfallNext24HoursMm >= RAIN_TO_DEFER_MM)
      || (precipitationProbabilityPercent !== null
        && precipitationProbabilityPercent >= HIGH_RAIN_PROBABILITY)
    ) {
      status = "rainfall-likely";
      recommendedTiming = "Reassess after the forecast rain; do not irrigate solely on this forecast.";
      recommendation = "Rain is forecast soon. Consider delaying irrigation and check actual rainfall and field conditions afterward.";
    } else if (
      rainfallNext24HoursMm !== null
      && rainfallNext24HoursMm < RAIN_TO_CHECK_MM
      && (precipitationProbabilityPercent === null
        || precipitationProbabilityPercent < MODERATE_RAIN_PROBABILITY)
    ) {
      status = "field-check-recommended";
      recommendedTiming = "Inspect the field today, preferably during a cooler part of the day.";
      recommendation = "Little rain is forecast. Check the crop and root-zone soil; irrigate only if field conditions and the crop-specific schedule indicate a need.";
    } else {
      status = "monitor-and-reassess";
      recommendedTiming = "Recheck the forecast and field after the next rainfall window.";
      recommendation = "Some rainfall is possible. Monitor the crop and soil before deciding whether to irrigate.";
    }
  }

  const missingDataNotes = [
    "No soil-moisture sensor reading is available; none is inferred.",
    "No irrigation volume or duration is prescribed.",
    "Weather thresholds are planning heuristics, not official warnings or a locally calibrated crop model."
  ];
  if (soilType) {
    missingDataNotes.push(`Farmer-entered soil type: ${soilType}.`);
  }
  if (weatherError) {
    missingDataNotes.push(`Weather data unavailable: ${weatherError}`);
  }

  const agronomicWaterModel = getAgronomicWaterProfile(
    cropCycle?.cropName,
    cropCycle?.currentStage || cropCycle?.growthStage
  );

  return {
    status,
    recommendation,
    recommendedTiming,
    crop: cropCycle?.cropName || null,
    growthStage: cropCycle?.currentStage || cropCycle?.growthStage || null,
    stageSource: cropCycle?.stageSource || null,
    rainfallNext24HoursMm,
    precipitationProbabilityPercent,
    soilContext,
    cropStageGuidance: stageGuidance(cropCycle),
    agronomicWaterModel,
    evidence,
    missingInputs,
    notes: missingDataNotes,
    source: weather ? "OpenWeather forecast plus stored farm and soil records" : "Stored farm and crop records only",
    provenance: "ICAR-IIWM & FAO-56 Irrigation Agronomy Guidelines combined with Live Weather Forecast"
  };
};
