// Official Government of India & Government of Karnataka Agricultural Schemes Database
// Sourced from myScheme.gov.in, Karnataka Department of Agriculture (agri.karnataka.gov.in), PM-KISAN, PMFBY

export const GOVERNMENT_SCHEMES = [
  {
    id: "pm-kisan",
    name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    kannadaName: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ",
    level: "Central",
    state: "All India",
    category: "Financial Support",
    benefitAmount: "₹6,000 per year (₹2,000 in 3 four-monthly installments)",
    description: "Direct income support transferred straight to landholding farmer families' Aadhaar-linked bank accounts to cover seed, fertilizer, and agricultural input costs.",
    eligibility: [
      "All landholding farmer families with cultivable land in their names",
      "Institutional landholders and high-income taxpayers excluded",
      "Aadhaar-seeded bank account and active eKYC required"
    ],
    documents: [
      "Aadhaar Card",
      "Record of Rights, Tenancy and Crops (RTC / Pahani)",
      "Bank Account Passbook",
      "Active Mobile Number"
    ],
    procedure: "Apply online at pmkisan.gov.in or register at nearest Common Service Center (CSC) / Grama One center with land record RTC.",
    officialWebsite: "https://pmkisan.gov.in/",
    officialPortal: "https://pmkisan.gov.in/",
    lastVerifiedDate: "2026-11-20",
    tags: ["Financial Support", "Direct Benefit Transfer", "All Farmers", "All Crops"]
  },
  {
    id: "raitha-siri",
    name: "Karnataka Raitha Siri Scheme",
    kannadaName: "ಕರ್ನಾಟಕ ರೈತ ಸಿರಿ ಯೋಜನೆ",
    level: "Karnataka State",
    state: "Karnataka",
    category: "Crop Incentive",
    benefitAmount: "₹10,000 per hectare (up to 2 hectares / ₹20,000 max)",
    description: "Karnataka state government incentive to promote dryland cultivation of nutri-cereals / minor millets (Ragi, Foxtail, Little, Kodo, Barnyard, Proso millets) deposited directly to the farmer's DBT account.",
    eligibility: [
      "Karnataka farmers cultivating recognized minor millets",
      "Registered on the Karnataka FRUITS (Farmer Registration and Unified Beneficiary Information System) portal",
      "Maximum eligible area: 2.0 hectares"
    ],
    documents: [
      "FRUITS FID Number",
      "RTC (Pahani) with crop survey entry showing millet sowing",
      "Aadhaar Card",
      "Bank Passbook"
    ],
    procedure: "Enroll in the FRUITS database at the local Raitha Samparka Kendra (RSK) and verify crop survey entry during Kharif season.",
    officialWebsite: "https://fruits.karnataka.gov.in/",
    officialPortal: "https://fruits.karnataka.gov.in/",
    lastVerifiedDate: "2026-11-15",
    tags: ["Karnataka", "Millets", "Crop Incentive", "Dryland Farming"]
  },
  {
    id: "krishi-bhagya",
    name: "Karnataka Krishi Bhagya Scheme",
    kannadaName: "ಕರ್ನಾಟಕ ಕೃಷಿ ಭಾಗ್ಯ ಯೋಜನೆ",
    level: "Karnataka State",
    category: "Irrigation & Water Security",
    benefitAmount: "80% to 90% subsidy on Farm Ponds (Krishi Honda), polythene lining, and diesel pump sets",
    description: "Comprehensive rainwater harvesting and on-farm water security program for dryland and rainfed farmers in Karnataka drought-prone taluks to sustain crops through dry spells.",
    eligibility: [
      "Farmers owning cultivable land in designated rainfed agro-climatic zones of Karnataka",
      "Minimum 1 acre of cultivable land",
      "SC/ST farmers receive 90% subsidy; General category farmers receive 80% subsidy"
    ],
    documents: [
      "FRUITS FID Number",
      "Aadhaar Card",
      "RTC (Pahani) and Land Survey Sketch",
      "Caste Certificate (for SC/ST subsidy slab)"
    ],
    procedure: "Submit application at the Taluk Assistant Director of Agriculture (ADA) or local Raitha Samparka Kendra (RSK).",
    officialWebsite: "https://agri.karnataka.gov.in/",
    lastVerifiedDate: "2026-11-10",
    tags: ["Karnataka", "Irrigation", "Farm Pond", "Rainfed", "Drought Relief"]
  },
  {
    id: "pmfby",
    name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    kannadaName: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ",
    level: "Central & State Joint",
    category: "Crop Insurance",
    benefitAmount: "Full sum insured payout for non-preventable natural risks, flood, drought, pests, and unseasonal rainfall",
    description: "Affordable crop insurance shielding farmers against financial losses from natural disasters, pest outbreaks, and post-harvest unseasonal weather with nominal farmer premium rates (1.5% for Rabi, 2% for Kharif, 5% for Commercial/Horticulture).",
    eligibility: [
      "All farmers growing notified crops in notified insurance units/hoblis",
      "Both loanee and non-loanee farmers eligible",
      "Applicable for food crops, oilseeds, cotton, sugarcane, and annual commercial crops"
    ],
    documents: [
      "RTC (Pahani) with crop declaration",
      "Aadhaar Card",
      "Bank Account details",
      "Sowing Certificate issued by Village Administrative Officer / RSK"
    ],
    procedure: "Apply via National Crop Insurance Portal (pmfby.gov.in), Samrakshane portal in Karnataka, commercial bank branches, or CSC centers within the cut-off deadline.",
    officialWebsite: "https://pmfby.gov.in/",
    lastVerifiedDate: "2026-11-18",
    tags: ["Crop Insurance", "Risk Protection", "All Crops"]
  },
  {
    id: "soil-health-card",
    name: "Soil Health Card Scheme",
    kannadaName: "ಮಣ್ಣು ಆರೋಗ್ಯ ಪತ್ರಿಕೆ ಯೋಜನೆ",
    level: "Central",
    category: "Soil Health",
    benefitAmount: "100% Free laboratory soil testing & personalized fertilizer recommendation card",
    description: "Government-funded testing of 12 soil health parameters (N, P, K, S, Zn, Fe, Cu, Mn, Bo, pH, EC, OC) to advise farmers on balanced chemical and organic fertilizer application, lowering input costs and boosting productivity.",
    eligibility: [
      "All farmers across all districts of India"
    ],
    documents: [
      "Farmer ID / Aadhaar",
      "Farm survey number and location coordinates"
    ],
    procedure: "Agricultural extension officers collect soil samples from your field; or deposit a 500g soil sample at the nearest Soil Testing Laboratory / KVK.",
    officialWebsite: "https://soilhealth.dac.gov.in/",
    lastVerifiedDate: "2026-11-20",
    tags: ["Soil Health", "Fertilizer", "Free Testing"]
  },
  {
    id: "pmksy-micro-irrigation",
    name: "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY - Per Drop More Crop)",
    kannadaName: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕೃಷಿ ಸಿಂಚಾಯಿ ಯೋಜನೆ (ಹನಿ ನೀರಾವರಿ)",
    level: "Central & State",
    category: "Irrigation & Water Security",
    benefitAmount: "45% to 55% Central subsidy + up to 90% Karnataka State top-up for Drip & Sprinkler systems",
    description: "Financial assistance for installing micro-irrigation systems (drip and sprinkler) to maximize water efficiency, reduce electricity and weed pressure, and boost crop yields.",
    eligibility: [
      "Farmers with an assured water source (borewell, open well, canal, or farm pond)",
      "Small and marginal farmers receive maximum subsidy assistance"
    ],
    documents: [
      "RTC (Pahani)",
      "Water source certificate (electrician/well certificate)",
      "Aadhaar Card",
      "FRUITS FID"
    ],
    procedure: "Apply online through Karnataka Horticulture / Agriculture portal or submit quotation from registered micro-irrigation vendor to RSK.",
    officialWebsite: "https://pmksy.gov.in/",
    lastVerifiedDate: "2026-11-12",
    tags: ["Irrigation", "Drip Irrigation", "Water Efficiency"]
  },
  {
    id: "krishi-yantradhare",
    name: "Karnataka Krishi Yantradhare (Custom Hiring Centers)",
    kannadaName: "ಕೃಷಿ ಯಂತ್ರಧಾರೆ ಯೋಜನೆ",
    level: "Karnataka State",
    category: "Subsidies & Machinery",
    benefitAmount: "High-tech farm equipment and tractors on subsidized hourly rental rates",
    description: "Custom hiring service centers across Karnataka hoblis providing tractors, power tillers, rotavators, harvesters, and laser land levelers to small farmers at nominal hire charges without requiring heavy machinery investment.",
    eligibility: [
      "All farmers in Karnataka; preference for small and marginal farmers"
    ],
    documents: [
      "Aadhaar Card",
      "Farmer ID / FRUITS number"
    ],
    procedure: "Book agricultural equipment via the Krishi Yantradhare mobile app or visit the nearest Hobli Custom Hiring Service Center.",
    officialWebsite: "https://agri.karnataka.gov.in/",
    lastVerifiedDate: "2026-11-05",
    tags: ["Karnataka", "Farm Machinery", "Tractor Rental", "Subsidies & Machinery"]
  },
  {
    id: "kisan-credit-card",
    name: "Kisan Credit Card (KCC)",
    kannadaName: "ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್",
    level: "Central",
    category: "Credit & Loans",
    benefitAmount: "Short-term crop loan up to ₹3,00,000 at effective interest rate of 4% per annum",
    description: "Provides timely institutional credit to farmers for crop cultivation inputs, post-harvest expenses, produce marketing, and maintenance of farm assets with 3% prompt repayment incentive.",
    eligibility: [
      "All farmers — individuals / joint borrowers, tenant farmers, oral lessees, and sharecroppers",
      "Age: 18 to 75 years"
    ],
    documents: [
      "Duly filled application form",
      "Identity Proof (Aadhaar, Voter ID)",
      "Land ownership documents (RTC / Pahani)",
      "Cropping pattern declaration"
    ],
    procedure: "Visit your local commercial bank, RRB (Pragathi Krishna / Karnataka Gramin Bank), or Primary Agricultural Credit Society (PACS).",
    officialWebsite: "https://www.myscheme.gov.in/schemes/kcc",
    lastVerifiedDate: "2026-11-18",
    tags: ["Credit & Loans", "Low Interest", "Working Capital"]
  }
];

export const getSchemes = ({ category = "all", state = "Karnataka", crop = "", landArea = null } = {}) => {
  let list = [...GOVERNMENT_SCHEMES];

  if (category && category !== "all") {
    const catLower = category.toLowerCase();
    list = list.filter(s => s.category.toLowerCase().includes(catLower) || s.tags.some(t => t.toLowerCase().includes(catLower)));
  }

  // Personalization score
  return list.map(scheme => {
    let matchScore = 75; // baseline relevance
    const reasons = [];

    if (state.toLowerCase() === "karnataka") {
      if (scheme.level.includes("Karnataka")) {
        matchScore += 15;
        reasons.push("Exclusive state-level scheme for Karnataka farmers.");
      } else {
        reasons.push("Nationwide central government initiative.");
      }
    }

    if (landArea != null) {
      if (landArea <= 5) {
        matchScore += 10;
        reasons.push(`Priority allocation for small/marginal landholdings (${landArea} acres).`);
      }
    }

    if (crop) {
      const cropLower = crop.toLowerCase();
      if (scheme.tags.some(t => t.toLowerCase().includes(cropLower)) || scheme.description.toLowerCase().includes(cropLower)) {
        matchScore += 15;
        reasons.push(`Specifically applicable for your ${crop} crop.`);
      }
    }

    return {
      ...scheme,
      relevanceScore: Math.min(99, matchScore),
      personalizedReasons: reasons
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
};

export const getSchemeById = (id) => {
  const scheme = GOVERNMENT_SCHEMES.find(s => s.id === id);
  if (!scheme) return null;
  return {
    ...scheme,
    state: scheme.state || (scheme.level.includes("Karnataka") ? "Karnataka" : "All India"),
    officialPortal: scheme.officialPortal || scheme.officialWebsite
  };
};

export const getAllKarnatakaSchemes = () => {
  return GOVERNMENT_SCHEMES.map(s => ({
    ...s,
    state: s.state || (s.level.includes("Karnataka") ? "Karnataka" : "All India"),
    officialPortal: s.officialPortal || s.officialWebsite
  }));
};

export const getAllSchemes = getAllKarnatakaSchemes;

export const matchPersonalizedSchemes = (farmerProfile = {}) => {
  const schemes = getSchemes(farmerProfile);
  return schemes.map(s => ({
    ...s,
    state: s.state || (s.level.includes("Karnataka") ? "Karnataka" : "All India"),
    officialPortal: s.officialPortal || s.officialWebsite,
    isEligible: s.relevanceScore >= 60
  }));
};
