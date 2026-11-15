const RAIN_TO_DEFER_MM = 8;
const RAIN_TO_CHECK_MM = 2;
const HIGH_RAIN_PROBABILITY = 70;
const MODERATE_RAIN_PROBABILITY = 30;

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
    evidence,
    missingInputs,
    notes: missingDataNotes,
    source: weather ? "OpenWeather forecast plus stored farm and soil records" : "Stored farm and crop records only"
  };
};
