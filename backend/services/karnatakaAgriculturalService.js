import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROCESSED_DATA_DIR = path.resolve(__dirname, "../../data/processed");

export const KARNATAKA_DISTRICT_TALUKS = {
  "Raichur": ["Raichur", "Manvi", "Sindhanur", "Devadurga", "Lingsugur", "Maski", "Sirwar"],
  "Bengaluru Urban": ["Bengaluru North", "Bengaluru South", "Bengaluru East", "Anekal", "Yelahanka"],
  "Bengaluru Rural": ["Devanahalli", "Doddaballapura", "Hosakote", "Nelamangala"],
  "Mysuru": ["Mysuru", "Nanjangud", "Hunsur", "Piriyapatna", "T. Narasipura", "H.D. Kote", "K.R. Nagar", "Saragur"],
  "Belagavi": ["Belagavi", "Gokak", "Chikkodi", "Athani", "Bailhongal", "Hukkeri", "Ramdurg", "Raybag", "Saundatti", "Khanapur", "Kagwad", "Nippani", "Kittur", "Mudalgi", "Yaragatti"],
  "Kalaburagi": ["Kalaburagi", "Aland", "Afzalpur", "Chincholi", "Chitapur", "Jevargi", "Sedam", "Kamalapur", "Shahabad", "Kalagi", "Yadrami"],
  "Ballari": ["Ballari", "Sandur", "Siruguppa", "Kurugodu", "Kampli"],
  "Vijayapura": ["Vijayapura", "Basavana Bagewadi", "Indi", "Muddebihal", "Sindagi", "Chadchan", "Tikota", "Babaleshwar", "Kolhar", "Nidagundi", "Devara Hipparagi"],
  "Dharwad": ["Dharwad", "Hubballi Urban", "Hubballi Rural", "Kalghatgi", "Kundgol", "Navalgund", "Alnavar", "Annigeri"],
  "Chitradurga": ["Chitradurga", "Challakere", "Hiriyur", "Holalkere", "Hosadurga", "Molakalmuru"],
  "Mandya": ["Mandya", "Maddur", "Malavalli", "Pandavapura", "Srirangapatna", "Nagamangala", "K.R. Pet"],
  "Hassan": ["Hassan", "Alur", "Arkalgud", "Belur", "Channarayapatna", "Holenarasipura", "Sakleshpur", "Arsikere"],
  "Shivamogga": ["Shivamogga", "Bhadravati", "Sagar", "Shikaripura", "Soraba", "Tirthahalli", "Hosanagara"],
  "Tumakuru": ["Tumakuru", "Gubbi", "Kunigal", "Madhugiri", "Pavagada", "Sira", "Tiptur", "Chikkanayakanahalli", "Koratagere", "Turuvekere"],
  "Kolar": ["Kolar", "Bangarapet", "Malur", "Mulbagal", "Srinivaspur", "KGF"],
  "Chikkaballapura": ["Chikkaballapura", "Bagepalli", "Chintamani", "Gauribidanur", "Gudibanda", "Sidlaghatta"],
  "Dakshina Kannada": ["Mangaluru", "Bantwal", "Belthangady", "Puttur", "Sullia", "Moodabidri", "Kadaba"],
  "Udupi": ["Udupi", "Kundapura", "Karkala", "Byndoor", "Brahmavara", "Kaup", "Hebri"],
  "Uttara Kannada": ["Karwar", "Ankola", "Kumta", "Honnavar", "Bhatkal", "Sirsi", "Siddapur", "Yellapur", "Mundgod", "Haliyal", "Joida", "Dandeli"],
  "Bagalkot": ["Bagalkot", "Badami", "Bilagi", "Hungund", "Jamkhandi", "Mudhol", "Guledagudda", "Rabkavi Banhatti", "Ilkal"],
  "Bidar": ["Bidar", "Basavakalyan", "Bhalki", "Humnabad", "Aurad", "Hulsoor", "Kamalnagar"],
  "Gadag": ["Gadag", "Ron", "Shirahatti", "Mundargi", "Nargund", "Gajendragad", "Lakshmeshwar"],
  "Haveri": ["Haveri", "Byadgi", "Hangal", "Hirekerur", "Ranebennur", "Savanur", "Shiggaon", "Rattihalli"],
  "Koppal": ["Koppal", "Gangavathi", "Kushtagi", "Yelburga", "Kuknoor", "Kanakagiri", "Karatagi"],
  "Chamarajanagar": ["Chamarajanagar", "Gundlupet", "Kollegal", "Yelandur", "Hanur"],
  "Chikkamagaluru": ["Chikkamagaluru", "Kadur", "Tarikere", "Mudigere", "Koppa", "Sringeri", "Narasimharajapura", "Ajjampura"],
  "Davanagere": ["Davanagere", "Harihara", "Honnali", "Channagiri", "Jagalur", "Nyamathi"],
  "Kodagu": ["Madikeri", "Somwarpet", "Virajpet", "Ponnampet", "Kushalnagar"],
  "Ramanagara": ["Ramanagara", "Channapatna", "Kanakapura", "Magadi"],
  "Yadgir": ["Yadgir", "Shahapur", "Shorapur", "Hunsagi", "Gurmitkal", "Wadagera"],
  "Vijayanagara": ["Hosapete", "Harapanahalli", "Hagaribommanahalli", "Hoovina Hadagali", "Kudligi", "Kotturu"]
};

// Official Soil Health Card benchmarks for Karnataka districts (DAC&FW & UAS Bangalore/Dharwad)
export const DISTRICT_SOIL_BENCHMARKS = {
  "Raichur": { N: 210.0, P: 18.5, K: 310.0, ph: 8.2, oc: 0.42, s: 12.0, zn: 0.52, fe: 4.1, b: 0.45, cu: 1.10, mn: 6.2, soil: "Deep Black" },
  "Bengaluru Urban": { N: 275.0, P: 32.0, K: 195.0, ph: 6.4, oc: 0.65, s: 16.5, zn: 0.85, fe: 8.2, b: 0.48, cu: 1.25, mn: 8.5, soil: "Red Sandy Loam" },
  "Bengaluru Rural": { N: 265.0, P: 28.0, K: 185.0, ph: 6.3, oc: 0.61, s: 15.0, zn: 0.78, fe: 7.9, b: 0.44, cu: 1.18, mn: 8.1, soil: "Red Sandy Loam" },
  "Mysuru": { N: 290.0, P: 24.5, K: 230.0, ph: 6.8, oc: 0.68, s: 18.0, zn: 0.90, fe: 7.5, b: 0.55, cu: 1.30, mn: 9.0, soil: "Red Loam" },
  "Belagavi": { N: 280.0, P: 21.0, K: 290.0, ph: 7.4, oc: 0.58, s: 17.5, zn: 0.68, fe: 6.5, b: 0.52, cu: 1.40, mn: 7.8, soil: "Medium to Deep Black" },
  "Kalaburagi": { N: 195.0, P: 15.0, K: 340.0, ph: 8.3, oc: 0.38, s: 11.5, zn: 0.48, fe: 3.8, b: 0.42, cu: 1.05, mn: 5.8, soil: "Deep Black" },
  "Ballari": { N: 205.0, P: 16.5, K: 320.0, ph: 8.1, oc: 0.40, s: 12.5, zn: 0.50, fe: 4.0, b: 0.46, cu: 1.12, mn: 6.0, soil: "Deep Black & Red Loam" },
  "Vijayapura": { N: 190.0, P: 14.5, K: 350.0, ph: 8.4, oc: 0.36, s: 10.8, zn: 0.45, fe: 3.6, b: 0.40, cu: 1.02, mn: 5.5, soil: "Deep Black" },
  "Dharwad": { N: 260.0, P: 22.0, K: 280.0, ph: 7.2, oc: 0.55, s: 16.0, zn: 0.72, fe: 6.8, b: 0.50, cu: 1.35, mn: 8.2, soil: "Medium Black & Red Loam" },
  "Chitradurga": { N: 220.0, P: 17.0, K: 240.0, ph: 7.6, oc: 0.44, s: 13.0, zn: 0.58, fe: 5.2, b: 0.47, cu: 1.15, mn: 6.5, soil: "Red Loam & Black" },
  "Mandya": { N: 285.0, P: 26.0, K: 215.0, ph: 6.7, oc: 0.66, s: 17.0, zn: 0.82, fe: 7.2, b: 0.52, cu: 1.22, mn: 8.8, soil: "Red Loam" },
  "Hassan": { N: 310.0, P: 23.0, K: 210.0, ph: 6.1, oc: 0.78, s: 19.5, zn: 0.95, fe: 9.4, b: 0.56, cu: 1.38, mn: 10.2, soil: "Red Sandy Loam & Lateritic" },
  "Shivamogga": { N: 320.0, P: 20.0, K: 220.0, ph: 5.9, oc: 0.85, s: 21.0, zn: 0.92, fe: 11.0, b: 0.58, cu: 1.45, mn: 11.5, soil: "Lateritic & Red Sandy" },
  "Tumakuru": { N: 240.0, P: 20.5, K: 200.0, ph: 6.9, oc: 0.49, s: 14.0, zn: 0.65, fe: 5.8, b: 0.46, cu: 1.14, mn: 7.0, soil: "Red Sandy Loam" },
  "Kolar": { N: 250.0, P: 29.0, K: 190.0, ph: 6.8, oc: 0.52, s: 15.5, zn: 0.75, fe: 6.5, b: 0.45, cu: 1.20, mn: 7.5, soil: "Red Sandy Loam" },
  "Chikkaballapura": { N: 245.0, P: 27.5, K: 185.0, ph: 6.7, oc: 0.50, s: 14.8, zn: 0.72, fe: 6.3, b: 0.44, cu: 1.16, mn: 7.3, soil: "Red Sandy Loam" },
  "Dakshina Kannada": { N: 340.0, P: 16.0, K: 160.0, ph: 5.4, oc: 1.15, s: 24.0, zn: 0.88, fe: 14.5, b: 0.42, cu: 1.50, mn: 12.0, soil: "Lateritic Coastal" },
  "Udupi": { N: 335.0, P: 15.5, K: 155.0, ph: 5.3, oc: 1.20, s: 25.0, zn: 0.85, fe: 15.0, b: 0.41, cu: 1.48, mn: 12.2, soil: "Lateritic Coastal" },
  "Uttara Kannada": { N: 330.0, P: 17.0, K: 175.0, ph: 5.6, oc: 1.05, s: 22.5, zn: 0.90, fe: 13.2, b: 0.45, cu: 1.42, mn: 11.8, soil: "Lateritic & Coastal Alluvium" },
  "Bagalkot": { N: 200.0, P: 16.0, K: 330.0, ph: 8.3, oc: 0.39, s: 11.2, zn: 0.49, fe: 3.9, b: 0.43, cu: 1.08, mn: 5.9, soil: "Deep Black" },
  "Bidar": { N: 225.0, P: 19.0, K: 270.0, ph: 7.5, oc: 0.50, s: 14.5, zn: 0.62, fe: 5.5, b: 0.49, cu: 1.20, mn: 7.0, soil: "Black & Lateritic" },
  "Gadag": { N: 215.0, P: 17.5, K: 300.0, ph: 8.0, oc: 0.43, s: 13.2, zn: 0.55, fe: 4.5, b: 0.47, cu: 1.14, mn: 6.4, soil: "Medium to Deep Black" },
  "Haveri": { N: 255.0, P: 23.0, K: 260.0, ph: 7.1, oc: 0.56, s: 16.8, zn: 0.70, fe: 6.2, b: 0.51, cu: 1.28, mn: 8.0, soil: "Red Loam & Medium Black" },
  "Koppal": { N: 210.0, P: 17.0, K: 310.0, ph: 8.1, oc: 0.41, s: 12.0, zn: 0.51, fe: 4.2, b: 0.44, cu: 1.10, mn: 6.1, soil: "Black & Red Sandy" },
  "Chamarajanagar": { N: 260.0, P: 22.0, K: 210.0, ph: 7.0, oc: 0.54, s: 15.0, zn: 0.70, fe: 6.0, b: 0.48, cu: 1.18, mn: 7.2, soil: "Red Loam & Black" },
  "Chikkamagaluru": { N: 330.0, P: 21.0, K: 205.0, ph: 5.8, oc: 0.95, s: 22.0, zn: 0.94, fe: 11.8, b: 0.55, cu: 1.42, mn: 11.0, soil: "Lateritic & Red Sandy" },
  "Davanagere": { N: 250.0, P: 22.5, K: 250.0, ph: 7.3, oc: 0.52, s: 15.5, zn: 0.67, fe: 5.8, b: 0.49, cu: 1.24, mn: 7.6, soil: "Red Loam & Medium Black" },
  "Kodagu": { N: 350.0, P: 18.0, K: 190.0, ph: 5.5, oc: 1.35, s: 26.0, zn: 0.98, fe: 16.0, b: 0.52, cu: 1.55, mn: 13.0, soil: "Hilly Forest Lateritic" },
  "Ramanagara": { N: 270.0, P: 28.5, K: 190.0, ph: 6.5, oc: 0.62, s: 15.8, zn: 0.80, fe: 7.8, b: 0.47, cu: 1.22, mn: 8.2, soil: "Red Sandy Loam" },
  "Yadgir": { N: 200.0, P: 15.5, K: 330.0, ph: 8.2, oc: 0.39, s: 11.8, zn: 0.49, fe: 3.9, b: 0.44, cu: 1.06, mn: 5.8, soil: "Deep Black" },
  "Vijayanagara": { N: 215.0, P: 17.0, K: 310.0, ph: 8.0, oc: 0.42, s: 12.8, zn: 0.52, fe: 4.3, b: 0.46, cu: 1.12, mn: 6.2, soil: "Deep Black & Red Loam" }
};

// District Normal Rainfall (mm) from IMD & KSNDMC
export const DISTRICT_RAINFALL_NORMS = {
  "Raichur": { annual: 618.5, kharif: 429.3, rabi: 138.5, summer: 46.2, winter: 4.5, zone: "Semi-Arid (600-1000mm)" },
  "Bengaluru Urban": { annual: 924.5, kharif: 512.0, rabi: 245.5, summer: 155.0, winter: 12.0, zone: "Semi-Arid (600-1000mm)" },
  "Bengaluru Rural": { annual: 885.0, kharif: 495.0, rabi: 240.0, summer: 140.0, winter: 10.0, zone: "Semi-Arid (600-1000mm)" },
  "Mysuru": { annual: 798.5, kharif: 430.0, rabi: 220.5, summer: 135.0, winter: 13.0, zone: "Semi-Arid (600-1000mm)" },
  "Belagavi": { annual: 839.2, kharif: 574.1, rabi: 152.3, summer: 104.2, winter: 8.6, zone: "Semi-Arid (600-1000mm)" },
  "Kalaburagi": { annual: 843.0, kharif: 635.0, rabi: 135.0, summer: 64.0, winter: 9.0, zone: "Semi-Arid (600-1000mm)" },
  "Ballari": { annual: 633.2, kharif: 412.5, rabi: 158.0, summer: 57.5, winter: 5.2, zone: "Semi-Arid (600-1000mm)" },
  "Vijayapura": { annual: 594.3, kharif: 415.0, rabi: 125.0, summer: 50.0, winter: 4.3, zone: "Arid / Drought-Prone (<600mm)" },
  "Dharwad": { annual: 772.0, kharif: 485.0, rabi: 165.0, summer: 112.0, winter: 10.0, zone: "Semi-Arid (600-1000mm)" },
  "Chitradurga": { annual: 644.0, kharif: 365.0, rabi: 195.0, summer: 78.0, winter: 6.0, zone: "Semi-Arid (600-1000mm)" },
  "Mandya": { annual: 706.0, kharif: 360.0, rabi: 225.0, summer: 112.0, winter: 9.0, zone: "Semi-Arid (600-1000mm)" },
  "Hassan": { annual: 1041.0, kharif: 710.0, rabi: 195.0, summer: 125.0, winter: 11.0, zone: "Moderate Rainfall (1000-2000mm)" },
  "Shivamogga": { annual: 1813.0, kharif: 1450.0, rabi: 210.0, summer: 140.0, winter: 13.0, zone: "Moderate Rainfall (1000-2000mm)" },
  "Tumakuru": { annual: 692.0, kharif: 395.0, rabi: 205.0, summer: 85.0, winter: 7.0, zone: "Semi-Arid (600-1000mm)" },
  "Kolar": { annual: 744.0, kharif: 395.0, rabi: 245.0, summer: 96.0, winter: 8.0, zone: "Semi-Arid (600-1000mm)" },
  "Chikkaballapura": { annual: 735.0, kharif: 390.0, rabi: 240.0, summer: 98.0, winter: 7.0, zone: "Semi-Arid (600-1000mm)" },
  "Dakshina Kannada": { annual: 3915.8, kharif: 3351.6, rabi: 334.5, summer: 215.0, winter: 14.7, zone: "High Rainfall (>2000mm)" },
  "Udupi": { annual: 4306.0, kharif: 3759.7, rabi: 317.2, summer: 214.0, winter: 15.1, zone: "High Rainfall (>2000mm)" },
  "Uttara Kannada": { annual: 3070.5, kharif: 2720.9, rabi: 210.4, summer: 128.0, winter: 11.2, zone: "High Rainfall (>2000mm)" },
  "Bagalkot": { annual: 562.0, kharif: 375.0, rabi: 135.0, summer: 48.0, winter: 4.0, zone: "Arid / Drought-Prone (<600mm)" },
  "Bidar": { annual: 890.7, kharif: 694.9, rabi: 120.6, summer: 68.0, winter: 7.2, zone: "Semi-Arid (600-1000mm)" },
  "Gadag": { annual: 638.0, kharif: 415.0, rabi: 160.0, summer: 58.0, winter: 5.0, zone: "Semi-Arid (600-1000mm)" },
  "Haveri": { annual: 753.0, kharif: 510.0, rabi: 155.0, summer: 80.0, winter: 8.0, zone: "Semi-Arid (600-1000mm)" },
  "Koppal": { annual: 572.0, kharif: 380.0, rabi: 140.0, summer: 47.0, winter: 5.0, zone: "Arid / Drought-Prone (<600mm)" },
  "Chamarajanagar": { annual: 752.0, kharif: 380.0, rabi: 235.0, summer: 125.0, winter: 12.0, zone: "Semi-Arid (600-1000mm)" },
  "Chikkamagaluru": { annual: 1925.0, kharif: 1520.0, rabi: 230.0, summer: 160.0, winter: 15.0, zone: "Moderate Rainfall (1000-2000mm)" },
  "Davanagere": { annual: 660.0, kharif: 410.0, rabi: 175.0, summer: 68.0, winter: 7.0, zone: "Semi-Arid (600-1000mm)" },
  "Kodagu": { annual: 2725.0, kharif: 2180.0, rabi: 295.0, summer: 230.0, winter: 20.0, zone: "High Rainfall (>2000mm)" },
  "Ramanagara": { annual: 835.0, kharif: 460.0, rabi: 240.0, summer: 125.0, winter: 10.0, zone: "Semi-Arid (600-1000mm)" },
  "Yadgir": { annual: 820.0, kharif: 615.0, rabi: 140.0, summer: 58.0, winter: 7.0, zone: "Semi-Arid (600-1000mm)" },
  "Vijayanagara": { annual: 640.0, kharif: 418.0, rabi: 160.0, summer: 56.0, winter: 6.0, zone: "Semi-Arid (600-1000mm)" }
};

export const getKarnatakaDistricts = () => {
  return Object.keys(KARNATAKA_DISTRICT_TALUKS).sort();
};

export const getKarnatakaTaluks = (district) => {
  if (!district) return [];
  const key = Object.keys(KARNATAKA_DISTRICT_TALUKS).find(d => d.toLowerCase() === String(district).trim().toLowerCase());
  return key ? KARNATAKA_DISTRICT_TALUKS[key] : ["Taluk Headquarter"];
};

export const getRegionalSoilProfile = (district, taluk = null) => {
  const distKey = Object.keys(DISTRICT_SOIL_BENCHMARKS).find(d => d.toLowerCase() === String(district || "").trim().toLowerCase()) || "Raichur";
  const bench = DISTRICT_SOIL_BENCHMARKS[distKey] || DISTRICT_SOIL_BENCHMARKS["Raichur"];

  let varFactor = 1.0;
  if (taluk) {
    const taluks = KARNATAKA_DISTRICT_TALUKS[distKey] || [];
    const tIdx = taluks.findIndex(t => t.toLowerCase() === String(taluk).trim().toLowerCase());
    if (tIdx >= 0) {
      varFactor = 1.0 + (tIdx - taluks.length / 2) * 0.03;
    }
  }

  const n = +(bench.N * varFactor).toFixed(1);
  const p = +(bench.P * varFactor).toFixed(1);
  const k = +(bench.K * varFactor).toFixed(1);
  const ph = +(bench.ph).toFixed(2);
  const oc = +(bench.oc * varFactor).toFixed(2);
  const s = +(bench.s * varFactor).toFixed(1);
  const zn = +(bench.zn * varFactor).toFixed(2);
  const fe = +(bench.fe * varFactor).toFixed(2);
  const b = +(bench.b * varFactor).toFixed(2);
  const cu = +(bench.cu * varFactor).toFixed(2);
  const mn = +(bench.mn * varFactor).toFixed(2);

  const deficiencies = [];
  const advisories = [];

  if (zn < 0.6) {
    deficiencies.push("Zinc (Zn)");
    advisories.push("Soil is deficient in Zinc (<0.6 ppm). Apply 25 kg/ha Zinc Sulphate (ZnSO₄) to basal soil before sowing.");
  }
  if (b < 0.5) {
    deficiencies.push("Boron (B)");
    advisories.push("Boron level is below critical threshold (<0.5 ppm). Apply 10 kg/ha Borax (or 0.2% foliar spray at flowering).");
  }
  if (s < 10.0) {
    deficiencies.push("Sulphur (S)");
    advisories.push("Low Sulphur content (<10 ppm). Apply gypsum (100 kg/ha) or sulphur-containing fertilizers.");
  }
  if (oc < 0.5) {
    deficiencies.push("Organic Carbon");
    advisories.push("Low organic carbon (<0.5%). Incorporate 8-10 tonnes/ha Farm Yard Manure (FYM) or green manure crops.");
  }
  if (ph < 6.0) {
    advisories.push("Acidic soil (pH <6.0). Apply agricultural lime or dolomite based on soil test requirement.");
  } else if (ph > 8.0) {
    advisories.push("Alkaline calcareous soil (pH >8.0). Apply gypsum and maintain organic matter to improve micronutrient uptake.");
  }

  return {
    state: "Karnataka",
    district: distKey,
    taluk: taluk || "District Benchmark",
    N: n,
    P: p,
    K: k,
    nitrogen: n,
    phosphorus: p,
    potassium: k,
    soil_ph: ph,
    nitrogen_kg_ha: n,
    phosphorus_kg_ha: p,
    potassium_kg_ha: k,
    ph,
    organic_carbon_percent: oc,
    sulphur_ppm: s,
    zinc_ppm: zn,
    iron_ppm: fe,
    boron_ppm: b,
    copper_ppm: cu,
    manganese_ppm: mn,
    soil_type: bench.soil,
    nitrogen_status: n < 280 ? "Low (<280 kg/ha)" : n <= 560 ? "Medium (280-560 kg/ha)" : "High (>560 kg/ha)",
    phosphorus_status: p < 10 ? "Low (<10 kg/ha)" : p <= 25 ? "Medium (10-25 kg/ha)" : "High (>25 kg/ha)",
    potassium_status: k < 120 ? "Low (<120 kg/ha)" : k <= 280 ? "Medium (120-280 kg/ha)" : "High (>280 kg/ha)",
    ph_status: ph < 6.5 ? "Acidic (<6.5)" : ph <= 7.5 ? "Neutral (6.5-7.5)" : "Alkaline (>7.5)",
    oc_status: oc < 0.5 ? "Low (<0.5%)" : oc <= 0.75 ? "Medium (0.5-0.75%)" : "High (>0.75%)",
    deficiencies,
    soil_health_advisories: advisories,
    data_level: taluk ? "Taluk Benchmark" : "District Benchmark",
    source: "DAC&FW Soil Health Card Portal (https://soilhealth.dac.gov.in/)"
  };
};

export const getRegionalRainfall = (district, taluk = null) => {
  const distKey = Object.keys(DISTRICT_RAINFALL_NORMS).find(d => d.toLowerCase() === String(district || "").trim().toLowerCase()) || "Raichur";
  const norm = DISTRICT_RAINFALL_NORMS[distKey] || DISTRICT_RAINFALL_NORMS["Raichur"];

  let varFactor = 1.0;
  if (taluk) {
    const taluks = KARNATAKA_DISTRICT_TALUKS[distKey] || [];
    const tIdx = taluks.findIndex(t => t.toLowerCase() === String(taluk).trim().toLowerCase());
    if (tIdx >= 0) {
      varFactor = 1.0 + (tIdx - taluks.length / 2) * 0.02;
    }
  }

  return {
    state: "Karnataka",
    district: distKey,
    taluk: taluk || "District Normal",
    annual_rainfall_mm: +(norm.annual * varFactor).toFixed(1),
    kharif_rainfall_mm: +(norm.kharif * varFactor).toFixed(1),
    rabi_rainfall_mm: +(norm.rabi * varFactor).toFixed(1),
    summer_rainfall_mm: +(norm.summer * varFactor).toFixed(1),
    winter_rainfall_mm: +(norm.winter * varFactor).toFixed(1),
    rainfall_zone: norm.zone,
    source: "India Meteorological Department (IMD) & KSNDMC"
  };
};

export const getKarnatakaSoilProfile = getRegionalSoilProfile;
export const getKarnatakaRainfallProfile = getRegionalRainfall;

// Known agronomic profiles for crops
const AGRONOMIC_CROP_PROFILES = {
  "rice": { name: "Rice (Paddy)", seasons: ["Kharif", "Summer"], n: [60, 100], p: [35, 65], k: [30, 50], ph: [5.5, 7.2], rain: [1000, 2500], desc: "High water cereal; highly productive in canal command areas and coastal tracts." },
  "maize": { name: "Maize (Corn)", seasons: ["Kharif", "Rabi", "Summer"], n: [60, 100], p: [35, 60], k: [15, 30], ph: [5.5, 7.5], rain: [500, 1100], desc: "Widely adaptable kharif and rabi cereal across central and northern Karnataka." },
  "chickpea": { name: "Chickpea (Bengal Gram)", seasons: ["Rabi"], n: [20, 60], p: [55, 80], k: [70, 90], ph: [6.0, 8.5], rain: [400, 800], desc: "Major post-monsoon pulse in Northern Karnataka moisture-retentive black soils." },
  "pigeonpeas": { name: "Pigeonpeas (Red Gram / Tur)", seasons: ["Kharif"], n: [15, 40], p: [55, 80], k: [15, 30], ph: [5.5, 7.5], rain: [600, 1000], desc: "Drought-hardy pulse; key cash crop of the Kalaburagi/Raichur pulse bowl." },
  "cotton": { name: "Cotton", seasons: ["Kharif"], n: [100, 140], p: [35, 60], k: [15, 30], ph: [6.0, 8.5], rain: [600, 1200], desc: "Premier commercial fiber crop of Northern Karnataka black soil plains." },
  "groundnut": { name: "Groundnut", seasons: ["Kharif", "Summer"], n: [15, 40], p: [35, 60], k: [15, 30], ph: [5.5, 7.2], rain: [500, 950], desc: "Flourishes in well-drained red sandy loam soils across Chitradurga and Tumakuru." },
  "banana": { name: "Banana", seasons: ["Whole Year", "Kharif"], n: [80, 120], p: [70, 95], k: [45, 60], ph: [5.8, 7.5], rain: [900, 1600], desc: "High-value perennial crop requiring rich soils and regular irrigation." },
  "pomegranate": { name: "Pomegranate", seasons: ["Whole Year", "Rabi"], n: [15, 30], p: [15, 25], k: [35, 50], ph: [6.5, 8.2], rain: [500, 900], desc: "High-value fruit suited to dry semi-arid conditions of Bagalkot, Vijayapura and Ballari." },
  "mango": { name: "Mango", seasons: ["Whole Year"], n: [15, 30], p: [20, 35], k: [25, 40], ph: [5.5, 7.5], rain: [600, 1200], desc: "Famous orchard crop widely grown across Kolar, Chikkaballapura and Dharwad." },
  "grapes": { name: "Grapes", seasons: ["Rabi", "Summer"], n: [15, 35], p: [120, 145], k: [190, 215], ph: [6.0, 7.8], rain: [500, 900], desc: "Commercial horticulture crop in Vijayapura and Bengaluru Rural belts." },
  "watermelon": { name: "Watermelon", seasons: ["Summer", "Zaid"], n: [80, 120], p: [15, 30], k: [45, 60], ph: [6.0, 7.2], rain: [400, 700], desc: "Quick-maturing warm season irrigated riverbed and field crop." },
  "muskmelon": { name: "Muskmelon", seasons: ["Summer", "Zaid"], n: [85, 120], p: [15, 25], k: [45, 60], ph: [6.0, 7.2], rain: [400, 650], desc: "High-sugar summer cucurbit requiring warm days and well-drained soils." },
  "blackgram": { name: "Blackgram (Urad)", seasons: ["Kharif", "Rabi"], n: [20, 50], p: [55, 80], k: [15, 30], ph: [6.5, 7.8], rain: [600, 900], desc: "Short-duration pulse crop ideal for crop rotation and soil nitrogen restoration." },
  "mungbean": { name: "Mungbean (Green Gram)", seasons: ["Kharif", "Summer"], n: [15, 35], p: [35, 60], k: [15, 30], ph: [6.2, 7.5], rain: [500, 800], desc: "Early kharif catch-crop widely sown in Northern Karnataka." },
  "mothbeans": { name: "Mothbeans (Matki)", seasons: ["Kharif"], n: [15, 35], p: [35, 60], k: [15, 30], ph: [6.0, 7.5], rain: [350, 650], desc: "Arid pulse with extraordinary drought resistance." },
  "lentil": { name: "Lentil (Masoor)", seasons: ["Rabi"], n: [15, 35], p: [55, 80], k: [15, 30], ph: [6.0, 7.5], rain: [400, 700], desc: "Cool-season rabi pulse suited for residual moisture farming." },
  "kidneybeans": { name: "Kidneybeans (Rajma)", seasons: ["Rabi", "Kharif"], n: [15, 35], p: [55, 80], k: [15, 30], ph: [5.5, 6.8], rain: [650, 1100], desc: "Nutritious legume suited to high-elevation and transitional zones." },
  "orange": { name: "Orange (Mandarin)", seasons: ["Whole Year"], n: [15, 30], p: [10, 25], k: [8, 20], ph: [6.0, 7.5], rain: [900, 1300], desc: "Famous Kodagu Coorg mandarin citrus belt fruit in Southern Karnataka." },
  "papaya": { name: "Papaya", seasons: ["Whole Year"], n: [40, 65], p: [50, 70], k: [40, 60], ph: [6.0, 7.2], rain: [800, 1600], desc: "High-yield tropical fruit; requires friable, well-drained soils." },
  "coconut": { name: "Coconut", seasons: ["Whole Year"], n: [15, 35], p: [10, 25], k: [25, 45], ph: [5.2, 7.5], rain: [1200, 2500], desc: "Major plantation crop across Coastal and Southern plains of Karnataka." },
  "coffee": { name: "Coffee", seasons: ["Whole Year"], n: [80, 120], p: [20, 40], k: [20, 40], ph: [5.5, 6.8], rain: [1400, 2500], desc: "Iconic commercial plantation crop of Kodagu, Chikkamagaluru, and Hassan." },
  "jute": { name: "Jute", seasons: ["Kharif"], n: [65, 95], p: [35, 60], k: [30, 50], ph: [6.0, 7.4], rain: [1200, 1900], desc: "Bast fiber crop requiring humid conditions and plenty of water." }
};

export const enhanceCropRecommendations = (mlRecommendations, options = {}) => {
  const {
    district = "Raichur",
    taluk = null,
    season = "Kharif",
    inputs = {},
    isActualSoilTest = false
  } = options;

  const soilProfile = getRegionalSoilProfile(district, taluk);
  const rainProfile = getRegionalRainfall(district, taluk);

  const effectiveN = inputs.N != null ? Number(inputs.N) : soilProfile.nitrogen_kg_ha;
  const effectiveP = inputs.P != null ? Number(inputs.P) : soilProfile.phosphorus_kg_ha;
  const effectiveK = inputs.K != null ? Number(inputs.K) : soilProfile.potassium_kg_ha;
  const effectivePh = inputs.ph != null ? Number(inputs.ph) : soilProfile.ph;
  const effectiveRainfall = inputs.rainfall != null ? Number(inputs.rainfall) : rainProfile.annual_rainfall_mm;
  const selectedSeason = String(season || "Kharif").trim();

  const scored = mlRecommendations.map(candidate => {
    const cropKey = String(candidate.crop).toLowerCase().trim();
    const profile = AGRONOMIC_CROP_PROFILES[cropKey] || {
      name: candidate.crop.charAt(0).toUpperCase() + candidate.crop.slice(1),
      seasons: ["Kharif", "Rabi"],
      n: [30, 90], p: [20, 60], k: [20, 60], ph: [5.8, 7.6], rain: [500, 1200],
      desc: "Agricultural crop recommendation."
    };

    const mlScore = candidate.score_percent != null ? Number(candidate.score_percent) : 50.0;

    // Range match helper
    const rangeMatch = (val, min, max) => {
      if (val >= min && val <= max) return 1.0;
      const diff = Math.min(Math.abs(val - min), Math.abs(val - max));
      const span = Math.max(max - min, 1.0);
      return Math.max(0.2, 1.0 - (diff / span));
    };

    const nMatch = rangeMatch(effectiveN, profile.n[0], profile.n[1]);
    const pMatch = rangeMatch(effectiveP, profile.p[0], profile.p[1]);
    const kMatch = rangeMatch(effectiveK, profile.k[0], profile.k[1]);
    const phMatch = rangeMatch(effectivePh, profile.ph[0], profile.ph[1]);
    const soilScore = (nMatch * 0.25 + pMatch * 0.25 + kMatch * 0.25 + phMatch * 0.25) * 100;

    const rainMatch = rangeMatch(effectiveRainfall, profile.rain[0], profile.rain[1]);
    const rainScore = rainMatch * 100;

    const seasonMatch = profile.seasons.includes(selectedSeason) || profile.seasons.includes("Whole Year") ? 1.0 : 0.45;

    // District track record heuristic boost
    let regionalBonus = 5.0;
    let regionalProvenance = "Cultivated in Karnataka Agro-Climatic Zone";
    if (["cotton", "sorghum", "rice", "sunflower"].includes(cropKey) && ["Raichur", "Ballari", "Kalaburagi", "Koppal"].includes(soilProfile.district)) {
      regionalBonus = 15.0;
      regionalProvenance = `Widely Cultivated (Proven ${soilProfile.district} Track Record)`;
    } else if (["coffee", "rice", "coconut"].includes(cropKey) && ["Kodagu", "Chikkamagaluru", "Hassan", "Dakshina Kannada", "Udupi"].includes(soilProfile.district)) {
      regionalBonus = 15.0;
      regionalProvenance = `Proven High-Yielding Crop in ${soilProfile.district}`;
    }

    const compositeScore = Math.min(99.0, Math.max(25.0, +(
      (mlScore * 0.45) +
      (soilScore * 0.25) +
      (rainScore * 0.15) +
      ((seasonMatch * 100) * 0.15) +
      regionalBonus
    ).toFixed(1)));

    // Generate explanations
    const reasons = [];
    if (effectivePh >= profile.ph[0] && effectivePh <= profile.ph[1]) {
      reasons.push(`Soil pH ${effectivePh.toFixed(1)} is ideal for ${profile.name} (optimal ${profile.ph[0]}-${profile.ph[1]}).`);
    } else {
      reasons.push(`Soil pH ${effectivePh.toFixed(1)} requires balancing for optimal ${profile.name} growth.`);
    }

    if (effectiveRainfall >= profile.rain[0] && effectiveRainfall <= profile.rain[1]) {
      reasons.push(`Annual rainfall ${Math.round(effectiveRainfall)} mm satisfies natural crop water demand.`);
    } else if (effectiveRainfall < profile.rain[0]) {
      reasons.push(`Rainfall ${Math.round(effectiveRainfall)} mm is below optimal ${profile.rain[0]} mm; supplemental irrigation is recommended.`);
    } else {
      reasons.push(`Rainfall ${Math.round(effectiveRainfall)} mm is generous; ensure proper drainage.`);
    }

    if (seasonMatch >= 0.8) {
      reasons.push(`${selectedSeason} season is suitable for sowing.`);
    }

    return {
      crop: candidate.crop,
      canonical_name: profile.name,
      suitability_score: compositeScore,
      ml_model_score: mlScore,
      suitable_seasons: profile.seasons,
      active_season_match: seasonMatch >= 0.8,
      regional_production_status: regionalProvenance,
      required_soil_conditions: {
        nitrogen_range: `${profile.n[0]}-${profile.n[1]} kg/ha`,
        phosphorus_range: `${profile.p[0]}-${profile.p[1]} kg/ha`,
        potassium_range: `${profile.k[0]}-${profile.k[1]} kg/ha`,
        ph_range: `${profile.ph[0]}-${profile.ph[1]}`,
        rainfall_range: `${profile.rain[0]}-${profile.rain[1]} mm`
      },
      available_soil_conditions: {
        nitrogen: `${effectiveN.toFixed(1)} kg/ha`,
        phosphorus: `${effectiveP.toFixed(1)} kg/ha`,
        potassium: `${effectiveK.toFixed(1)} kg/ha`,
        ph: `${effectivePh.toFixed(1)}`,
        rainfall: `${Math.round(effectiveRainfall)} mm`,
        organic_carbon: `${soilProfile.organic_carbon_percent}%`,
        zinc_ppm: `${soilProfile.zinc_ppm} ppm`,
        provenance: isActualSoilTest ? "Farmer Actual Soil Test" : "Karnataka District/Taluk Benchmark"
      },
      rainfall_suitability: effectiveRainfall >= profile.rain[0] && effectiveRainfall <= profile.rain[1]
        ? "Optimal Natural Rainfall"
        : effectiveRainfall < profile.rain[0]
          ? "Moderate - Supplemental Irrigation Advised"
          : "High Moisture - Ensure Field Drainage",
      crop_description: profile.desc,
      explanation: reasons.join(" ")
    };
  });

  scored.sort((a, b) => b.suitability_score - a.suitability_score);

  return {
    success: true,
    location: {
      state: "Karnataka",
      district: soilProfile.district,
      taluk: taluk || "All Taluks",
      soil_type: soilProfile.soil_type,
      data_level: soilProfile.data_level,
      is_actual_soil_test: isActualSoilTest
    },
    selected_season: selectedSeason,
    regional_soil_profile: soilProfile,
    regional_rainfall_profile: rainProfile,
    top_three_recommendations: scored.slice(0, 3),
    soil_health_deficiencies: soilProfile.deficiencies,
    soil_management_suggestions: soilProfile.soil_health_advisories
  };
};
