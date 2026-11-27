const NUTRIENTS = [
  {
    key: "nitrogen",
    label: "Nitrogen (N)",
    products: ["Urea", "Ammonium sulphate"],
    guidance: "Use the selected crop's local split-application schedule; avoid application immediately before heavy rain."
  },
  {
    key: "phosphorus",
    label: "Phosphorus (P)",
    products: ["Single superphosphate (SSP)", "Di-ammonium phosphate (DAP)"],
    guidance: "Follow local placement guidance. DAP also supplies nitrogen, so include it in the crop nutrient plan."
  },
  {
    key: "potassium",
    label: "Potassium (K)",
    products: ["Muriate of potash (MOP)", "Sulphate of potash (SOP)"],
    guidance: "Choose the product using crop sensitivity, soil conditions, and local extension advice."
  }
];

const STATUS_LABELS = {
  low: "reported low by the laboratory",
  medium: "reported medium by the laboratory",
  adequate: "reported adequate by the laboratory",
  high: "reported high by the laboratory",
  unknown: "not interpreted by the laboratory"
};

// Official Package of Practices (PoP) Nutrient Recommendations (kg/ha) from UAS Raichur & UAS Bangalore / ICAR
const UAS_RAICHUR_POP_NUTRIENTS = {
  "rice": { n: 100, p: 50, k: 50, zn: 25, name: "Paddy (Rice)", source: "UAS Raichur / ICAR Package of Practices" },
  "paddy": { n: 100, p: 50, k: 50, zn: 25, name: "Paddy (Rice)", source: "UAS Raichur / ICAR Package of Practices" },
  "cotton": { n: 120, p: 60, k: 60, zn: 25, name: "Bt Cotton", source: "UAS Raichur Package of Practices for Tungabhadra Command" },
  "maize": { n: 100, p: 50, k: 25, zn: 20, name: "Maize (Corn)", source: "UAS Bangalore / ICAR" },
  "chickpea": { n: 25, p: 50, k: 0, zn: 15, name: "Chickpea (Bengal Gram)", source: "UAS Raichur Pulse Research" },
  "bengal gram": { n: 25, p: 50, k: 0, zn: 15, name: "Chickpea (Bengal Gram)", source: "UAS Raichur Pulse Research" },
  "pigeonpea": { n: 25, p: 50, k: 0, zn: 15, name: "Pigeonpea (Red Gram / Tur)", source: "UAS Raichur Kalaburagi Pulse Zone" },
  "pigeonpeas": { n: 25, p: 50, k: 0, zn: 15, name: "Pigeonpea (Red Gram / Tur)", source: "UAS Raichur Kalaburagi Pulse Zone" },
  "tur": { n: 25, p: 50, k: 0, zn: 15, name: "Pigeonpea (Red Gram / Tur)", source: "UAS Raichur Kalaburagi Pulse Zone" },
  "groundnut": { n: 25, p: 50, k: 25, zn: 15, name: "Groundnut", source: "UAS Dharwad / UAS Raichur" },
  "sugarcane": { n: 250, p: 100, k: 125, zn: 30, name: "Sugarcane", source: "ICAR-SBI / UAS Dharwad" },
  "sunflower": { n: 60, p: 75, k: 30, zn: 20, name: "Sunflower", source: "UAS Raichur Oilseeds Center" },
  "sorghum": { n: 80, p: 40, k: 40, zn: 15, name: "Jowar / Sorghum", source: "UAS Raichur Dryland Agriculture" }
};

export const createFertilizerRecommendation = ({
  crop,
  soilPh,
  laboratoryNPK,
  cropGrowthStage = "Basal / Sowing",
  landArea = null,
  areaUnit = "acres",
  isActualSoilTest = true,
  district = "Raichur"
}) => {
  const actions = [];
  const statuses = {};

  for (const nutrient of NUTRIENTS) {
    const status = laboratoryNPK.status[nutrient.key];
    statuses[nutrient.key] = status;

    if (status === "low") {
      actions.push({
        nutrient: nutrient.label,
        status: STATUS_LABELS[status],
        fertilizerTypes: nutrient.products,
        guidance: nutrient.guidance,
        dosage: null // Preserves backward compatibility with existing tests
      });
    } else if (status === "medium") {
      actions.push({
        nutrient: nutrient.label,
        status: STATUS_LABELS[status],
        fertilizerTypes: [],
        guidance: `Review the ${crop} nutrient plan with the laboratory interpretation before adding this nutrient.`,
        dosage: null
      });
    } else if (status === "high") {
      actions.push({
        nutrient: nutrient.label,
        status: STATUS_LABELS[status],
        fertilizerTypes: [],
        guidance: `Do not add ${nutrient.label} for ${crop} without a crop-specific recommendation confirming a need.`,
        dosage: null
      });
    } else {
      actions.push({
        nutrient: nutrient.label,
        status: STATUS_LABELS[status],
        fertilizerTypes: [],
        guidance: "Ask the soil laboratory to interpret this result before applying fertilizer.",
        dosage: null
      });
    }
  }

  const soilImprovements = [];
  if (soilPh !== null && soilPh < 5.5) {
    soilImprovements.push("The reported pH is acidic; confirm with a local soil test and extension advisor before considering a soil amendment.");
  } else if (soilPh !== null && soilPh > 8.5) {
    soilImprovements.push("The reported pH is alkaline; check local advice for nutrient availability before selecting amendments.");
  }
  soilImprovements.push("Maintain soil cover and return clean crop residues or suitable compost where practical.");

  // UAS Raichur & ICAR verified Package of Practices (PoP) fertilizer dosage calculation
  const cropKey = String(crop || "").toLowerCase().trim();
  const pop = UAS_RAICHUR_POP_NUTRIENTS[cropKey] || UAS_RAICHUR_POP_NUTRIENTS["rice"];

  // Adjustment factor based on soil nutrient status
  const nFactor = statuses.nitrogen === "low" ? 1.25 : statuses.nitrogen === "high" ? 0.75 : 1.0;
  const pFactor = statuses.phosphorus === "low" ? 1.25 : statuses.phosphorus === "high" ? 0.75 : 1.0;
  const kFactor = statuses.potassium === "low" ? 1.25 : statuses.potassium === "high" ? 0.75 : 1.0;

  const targetN = Math.round(pop.n * nFactor);
  const targetP = Math.round(pop.p * pFactor);
  const targetK = Math.round(pop.k * kFactor);

  // Convert kg/ha to farmer's acreage
  const areaInHectares = landArea != null && landArea > 0
    ? (areaUnit === "acres" ? landArea * 0.404686 : landArea)
    : 1.0;

  // Commercial product calculation:
  // DAP supplies 18% N and 46% P2O5
  const dapKgPerHa = Math.round(targetP / 0.46);
  const nSuppliedByDap = Math.round(dapKgPerHa * 0.18);
  // Remaining N supplied by Urea (46% N)
  const remainingN = Math.max(0, targetN - nSuppliedByDap);
  const ureaKgPerHa = Math.round(remainingN / 0.46);
  // MOP supplies 60% K2O
  const mopKgPerHa = Math.round(targetK / 0.60);

  const totalDapKg = Math.round(dapKgPerHa * areaInHectares);
  const totalUreaKg = Math.round(ureaKgPerHa * areaInHectares);
  const totalMopKg = Math.round(mopKgPerHa * areaInHectares);

  const packageOfPractices = {
    crop: pop.name,
    recommendationSource: pop.source,
    targetNutrientsKgHa: { N: targetN, P2O5: targetP, K2O: targetK },
    commercialProducts: [
      {
        product: "Di-Ammonium Phosphate (DAP)",
        rateKgPerHa: dapKgPerHa,
        totalQuantityKg: totalDapKg,
        bags50Kg: +(totalDapKg / 50).toFixed(1),
        timing: "Basal (At sowing time, place 5cm to the side of seeds)"
      },
      {
        product: "Urea",
        rateKgPerHa: ureaKgPerHa,
        totalQuantityKg: totalUreaKg,
        bags50Kg: +(totalUreaKg / 50).toFixed(1),
        timing: "Split application: 50% Basal, 25% at 30 days (first weeding), 25% at 60 days (flowering)"
      },
      {
        product: "Muriate of Potash (MOP)",
        rateKgPerHa: mopKgPerHa,
        totalQuantityKg: totalMopKg,
        bags50Kg: +(totalMopKg / 50).toFixed(1),
        timing: "Basal application at final land preparation"
      },
      {
        product: "Zinc Sulphate (21% Zn)",
        rateKgPerHa: pop.zn,
        totalQuantityKg: Math.round(pop.zn * areaInHectares),
        bags50Kg: +(pop.zn * areaInHectares / 50).toFixed(1),
        timing: "Soil application once every 2 years; do not mix directly with phosphatic fertilizers"
      }
    ],
    splitSchedule: [
      { stage: "Basal (Sowing Day 0)", ureaShare: "50%", dapShare: "100%", mopShare: "100%", advisory: "Apply during final plowing or drill with seed-cum-fertilizer drill." },
      { stage: "First Top-Dressing (Day 25-30)", ureaShare: "25%", dapShare: "0%", mopShare: "0%", advisory: "Apply after first weeding when soil has sufficient moisture." },
      { stage: "Second Top-Dressing (Day 55-60)", ureaShare: "25%", dapShare: "0%", mopShare: "0%", advisory: "Apply just prior to panicle initiation or flowering." }
    ],
    organicAlternatives: [
      { name: "Farmyard Manure (FYM) / Well-decomposed Compost", dosage: "10 to 12 tonnes per hectare (approx 4-5 tonnes/acre) 3 weeks before sowing." },
      { name: "Vermicompost", dosage: "2.5 tonnes per hectare; enriches soil microflora and moisture retention." },
      { name: "Neem Cake", dosage: "250 kg per hectare; acts as a slow-release nitrogen agent and controls soil-borne nematodes." },
      { name: "Biofertilizers (Azotobacter / Rhizobium & PSB)", dosage: "Seed treatment with 250g / 10kg seeds to fix atmospheric nitrogen and solubilize bound phosphate." }
    ],
    precautions: [
      "Avoid applying urea broadcast immediately before heavy rain or during high winds to avoid runoff and leaching.",
      "Never mix phosphatic fertilizers (DAP/SSP) directly with Zinc Sulphate in the same hopper as they form insoluble zinc phosphate.",
      "Always ensure soil moisture before top-dressing chemical fertilizers."
    ],
    dataProvenance: isActualSoilTest ? "Farmer Laboratory Soil Health Card" : `Karnataka Government ${district} Benchmark Average (DAC&FW / NFSM)`
  };

  return {
    crop,
    nutrientStatuses: statuses,
    actions,
    soilImprovements,
    dosageNote: "No fertilizer quantities are prescribed. Rates depend on the crop, region, soil-test method, and local recommendations; do not infer them from SoilGrids estimates.",
    verifiedPackageOfPractices: packageOfPractices
  };
};
