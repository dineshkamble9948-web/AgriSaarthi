export const CROP_GROWTH_STAGES = [
  "Land Preparation",
  "Sowing",
  "Germination",
  "Vegetative Growth",
  "Flowering",
  "Maturity",
  "Harvesting"
];

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildCropCycleFields = (input, existing = {}) => {
  const cropName = String(input.cropName ?? existing.cropName ?? "").trim();
  const cropVariety = String(input.cropVariety ?? existing.cropVariety ?? "").trim();
  const sowingDate = parseDate(input.sowingDate ?? existing.sowingDate);
  const expectedHarvestDate = parseDate(input.expectedHarvestDate ?? existing.expectedHarvestDate);
  const growthStage = input.growthStage ?? existing.growthStage;
  const hasManualStage = input.growthStage !== undefined
    ? true
    : Boolean(existing.stageUpdatedManually);
  const actualHarvestInput = input.actualHarvestDate === undefined
    ? existing.actualHarvestDate
    : input.actualHarvestDate;
  const actualHarvestDate = actualHarvestInput === "" || actualHarvestInput == null
    ? null
    : parseDate(actualHarvestInput);

  if (!cropName || cropName.length > 60) {
    return { error: "Crop name must be between 1 and 60 characters." };
  }
  if (cropVariety.length > 100) {
    return { error: "Crop variety must be 100 characters or fewer." };
  }
  if (!sowingDate || !expectedHarvestDate || expectedHarvestDate <= sowingDate) {
    return { error: "Expected harvest date must be after the sowing date." };
  }
  if (actualHarvestInput && !actualHarvestDate) {
    return { error: "Actual harvest date must be a valid date." };
  }
  if (actualHarvestDate && actualHarvestDate < sowingDate) {
    return { error: "Actual harvest date cannot be before sowing." };
  }
  if (growthStage && !CROP_GROWTH_STAGES.includes(growthStage)) {
    return { error: "Choose a valid crop growth stage." };
  }

  const durationDays = Math.ceil((expectedHarvestDate - sowingDate) / DAY_MS);
  return {
    value: {
      cropName,
      cropVariety,
      sowingDate,
      expectedHarvestDate,
      durationDays,
      growthStage: growthStage || "Sowing",
      stageUpdatedManually: hasManualStage,
      stageUpdatedAt: input.growthStage !== undefined
        ? new Date()
        : existing.stageUpdatedAt ?? null,
      irrigationMethod: String(input.irrigationMethod ?? existing.irrigationMethod ?? "").trim(),
      actualHarvestDate,
      notes: String(input.notes ?? existing.notes ?? "").trim()
    }
  };
};

export const estimateCropStage = (cycle, now = new Date()) => {
  if (cycle.stageUpdatedManually) {
    return {
      currentStage: cycle.growthStage,
      stageSource: "farmer-updated",
      progressPercent: null
    };
  }

  const sowingDate = parseDate(cycle.sowingDate);
  const harvestDate = parseDate(cycle.expectedHarvestDate);
  const currentDate = parseDate(now);
  if (!sowingDate || !harvestDate || !currentDate || harvestDate <= sowingDate) {
    return {
      currentStage: null,
      stageSource: "unavailable",
      progressPercent: null
    };
  }
  if (currentDate < sowingDate) {
    return {
      currentStage: "Land Preparation",
      stageSource: "estimated-from-farmer-dates",
      progressPercent: 0
    };
  }

  const progress = Math.min(
    1,
    Math.max(0, (currentDate - sowingDate) / (harvestDate - sowingDate))
  );
  let currentStage = "Harvesting";
  if (progress === 0) currentStage = "Sowing";
  else if (progress < 0.1) currentStage = "Germination";
  else if (progress < 0.55) currentStage = "Vegetative Growth";
  else if (progress < 0.75) currentStage = "Flowering";
  else if (progress < 0.95) currentStage = "Maturity";

  return {
    currentStage,
    stageSource: "estimated-from-farmer-dates",
    progressPercent: Math.round(progress * 100)
  };
};

export const withCropStageEstimate = (cycle, now = new Date()) => ({
  ...cycle,
  ...estimateCropStage(cycle, now)
});
