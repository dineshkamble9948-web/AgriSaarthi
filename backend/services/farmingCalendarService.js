// Verified Agronomic Crop Calendar Templates based on UAS Raichur & ICAR Package of Practices

const CROP_CALENDAR_TEMPLATES = {
  "cotton": [
    { dayOffset: 0, stage: "Land Preparation & Sowing", activity: "Deep summer plowing, basal application of DAP (100 kg/ha) & MOP (50 kg/ha). Seed treatment with Imidacloprid.", category: "Sowing", important: true },
    { dayOffset: 15, stage: "Emergence & Gap Filling", activity: "Inspect seedling emergence, fill gaps, and maintain 90x60 cm plant spacing.", category: "Monitoring", important: false },
    { dayOffset: 30, stage: "First Weeding & Top Dressing", activity: "Inter-cultivation weeding and apply first split of Urea (65 kg/ha). Apply light irrigation.", category: "Fertilizer", important: true },
    { dayOffset: 50, stage: "Square Formation (Budding)", activity: "Scout for sucking pests (Aphids/Jassids/Thrips). Spray Neem seed kernel extract (NSKE 5%) if needed.", category: "Pest Scouting", important: true },
    { dayOffset: 65, stage: "Flowering & Peak Vegetative", activity: "Second top dressing with Urea (65 kg/ha). Foliar spray of Planofix (NAA @ 4.5ml/10L) to reduce flower drop.", category: "Fertilizer", important: true },
    { dayOffset: 80, stage: "Boll Formation & Water Management", activity: "Critical irrigation stage. Maintain soil moisture; avoid water stagnation. Scout for pink bollworm.", category: "Irrigation", important: true },
    { dayOffset: 110, stage: "Boll Maturation & Foliar Micronutrients", activity: "Foliar spray of 1% Magnesium Sulphate + 1% Potassium Nitrate (13:0:45) to prevent leaf reddening.", category: "Fertilizer", important: false },
    { dayOffset: 140, stage: "First Picking (Harvesting)", activity: "Harvest clean, fully opened bolls in dry morning weather. Store separately from pest-damaged lint.", category: "Harvest", important: true },
    { dayOffset: 165, stage: "Final Picking & Stalk Shredding", activity: "Complete final picking. Shred cotton stalks into the soil to prevent pink bollworm carryover.", category: "Harvest", important: true }
  ],
  "rice": [
    { dayOffset: 0, stage: "Nursery Sowing / Land Puddling", activity: "Puddle field twice. Apply basal fertilizer: 50% N + 100% P (DAP) + 50% K (MOP) + 25 kg Zinc Sulphate.", category: "Sowing", important: true },
    { dayOffset: 25, stage: "Transplanting / Direct Seeding", activity: "Transplant 20-25 day seedlings at 2-3 seedlings per hill (20x10 cm). Maintain 2-3 cm water level.", category: "Sowing", important: true },
    { dayOffset: 45, stage: "Tillering Stage", activity: "First top dressing with Urea (40 kg/ha). Weeding with cono-weeder or recommended herbicide.", category: "Fertilizer", important: true },
    { dayOffset: 70, stage: "Panicle Initiation", activity: "Second top dressing with remaining Urea (40 kg/ha) + remaining MOP (25 kg/ha). Maintain 5cm water level.", category: "Fertilizer", important: true },
    { dayOffset: 85, stage: "Flowering & Heading", activity: "Critical irrigation period. Scout for stem borer and blast. Maintain continuous standing water.", category: "Irrigation", important: true },
    { dayOffset: 105, stage: "Milking & Grain Filling", activity: "Drain water 10 days before expected harvest. Ensure soil remains firm for mechanical harvesting.", category: "Irrigation", important: false },
    { dayOffset: 125, stage: "Harvesting & Threshing", activity: "Harvest when 85-90% grains turn golden yellow. Sun-dry grains to 12% moisture before storage.", category: "Harvest", important: true }
  ],
  "paddy": [
    { dayOffset: 0, stage: "Nursery Sowing / Land Puddling", activity: "Puddle field twice. Apply basal fertilizer: 50% N + 100% P (DAP) + 50% K (MOP) + 25 kg Zinc Sulphate.", category: "Sowing", important: true },
    { dayOffset: 25, stage: "Transplanting / Direct Seeding", activity: "Transplant 20-25 day seedlings at 2-3 seedlings per hill (20x10 cm). Maintain 2-3 cm water level.", category: "Sowing", important: true },
    { dayOffset: 45, stage: "Tillering Stage", activity: "First top dressing with Urea (40 kg/ha). Weeding with cono-weeder or recommended herbicide.", category: "Fertilizer", important: true },
    { dayOffset: 70, stage: "Panicle Initiation", activity: "Second top dressing with remaining Urea (40 kg/ha) + remaining MOP (25 kg/ha). Maintain 5cm water level.", category: "Fertilizer", important: true },
    { dayOffset: 85, stage: "Flowering & Heading", activity: "Critical irrigation period. Scout for stem borer and blast. Maintain continuous standing water.", category: "Irrigation", important: true },
    { dayOffset: 105, stage: "Milking & Grain Filling", activity: "Drain water 10 days before expected harvest. Ensure soil remains firm for mechanical harvesting.", category: "Irrigation", important: false },
    { dayOffset: 125, stage: "Harvesting & Threshing", activity: "Harvest when 85-90% grains turn golden yellow. Sun-dry grains to 12% moisture before storage.", category: "Harvest", important: true }
  ],
  "chickpea": [
    { dayOffset: 0, stage: "Sowing & Basal Fertilizer", activity: "Seed treatment with Rhizobium + Trichoderma viride. Drill seed at 30x10 cm. Apply DAP @ 100 kg/ha.", category: "Sowing", important: true },
    { dayOffset: 25, stage: "Vegetative Branching", activity: "First hand weeding. If rain is absent, provide single light life-saving irrigation.", category: "Irrigation", important: false },
    { dayOffset: 45, stage: "Pre-Flowering", activity: "Scout for Helicoverpa (gram pod borer). Install pheromone traps (5/ha). Avoid excessive irrigation.", category: "Pest Scouting", important: true },
    { dayOffset: 65, stage: "Pod Development", activity: "Critical stage. Foliar spray of 2% Urea or DAP to boost pod fill. Biological spray of HaNPV if pod borer crosses ETL.", category: "Fertilizer", important: true },
    { dayOffset: 95, stage: "Harvesting & Drying", activity: "Harvest when leaves turn straw yellow and pods rattle. Thresh and clean grains.", category: "Harvest", important: true }
  ],
  "maize": [
    { dayOffset: 0, stage: "Sowing & Basal Nutrients", activity: "Sow at 60x20 cm. Apply basal: 50 kg Urea + 100 kg DAP + 40 kg MOP + 15 kg Zinc Sulphate.", category: "Sowing", important: true },
    { dayOffset: 20, stage: "Knee-High Stage", activity: "Inter-cultivation and apply first top dressing of Urea (65 kg/ha). Scout for Fall Armyworm (FAW).", category: "Fertilizer", important: true },
    { dayOffset: 45, stage: "Tasseling (Flower Initiation)", activity: "Critical irrigation stage. Apply second top dressing with Urea (65 kg/ha).", category: "Irrigation", important: true },
    { dayOffset: 65, stage: "Silking & Cob Filling", activity: "Ensure adequate soil moisture. Inspect cobs for armyworm larvae in whorls.", category: "Monitoring", important: true },
    { dayOffset: 100, stage: "Harvesting", activity: "Harvest when cob husk turns dry white and black layer forms at grain base.", category: "Harvest", important: true }
  ]
};

export const generateCropCalendar = (cropName, sowingDateStr) => {
  const cropKey = String(cropName || "").toLowerCase().trim();
  const template = CROP_CALENDAR_TEMPLATES[cropKey] || CROP_CALENDAR_TEMPLATES["cotton"];
  const sowingDate = sowingDateStr ? new Date(sowingDateStr) : new Date();

  return template.map((item, idx) => {
    const taskDate = new Date(sowingDate.getTime() + item.dayOffset * 86400000);
    return {
      taskId: `task_${cropKey}_${idx + 1}`,
      cropName,
      stage: item.stage,
      activity: item.activity,
      category: item.category,
      dayOffset: item.dayOffset,
      scheduledDate: taskDate.toISOString().split("T")[0],
      isCompleted: false,
      isImportant: item.important
    };
  });
};

export const generateFarmingCalendar = (params = {}) => {
  const cropName = typeof params === "string" ? params : params.crop || "Cotton";
  const sowingDateStr = typeof params === "object" ? params.sowingDate : null;
  const tasks = generateCropCalendar(cropName, sowingDateStr);

  const stageMap = new Map();
  tasks.forEach((task) => {
    if (!stageMap.has(task.stage)) {
      stageMap.set(task.stage, {
        stageName: task.stage,
        dayOffset: task.dayOffset,
        tasks: []
      });
    }
    stageMap.get(task.stage).tasks.push(task);
  });

  const stages = Array.from(stageMap.values());
  const maxDay = tasks.length > 0 ? Math.max(...tasks.map(t => t.dayOffset)) : 0;

  return {
    crop: cropName,
    variety: params.variety || "Standard Hybrid",
    totalDays: maxDay,
    tasks,
    stages
  };
};
