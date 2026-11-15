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

export const createFertilizerRecommendation = ({
  crop,
  soilPh,
  laboratoryNPK
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
        dosage: null
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

  return {
    crop,
    nutrientStatuses: statuses,
    actions,
    soilImprovements,
    dosageNote: "No fertilizer quantities are prescribed. Rates depend on the crop, region, soil-test method, and local recommendations; do not infer them from SoilGrids estimates."
  };
};
