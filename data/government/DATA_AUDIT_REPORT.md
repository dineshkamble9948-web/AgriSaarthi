# AGRISAARTHI DATA SOURCES AUDIT REPORT

**Date of Audit:** 2026-11-27  
**Platform:** AgriSaarthi Agricultural Assistance Platform  
**Geographical Scope:** Karnataka (Primary) & All India (Secondary)

---

## 1. Comprehensive Module-wise Data Source Audit

| Module Name | Current Data Source | Official Govt Source? | Actually Integrated? | Hardcoded vs Dynamic | Limitations & Required Improvements |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Crop Recommendation** | DAC&FW Soil Health Card, DES MoA&FW Crop Production (1997–2014), IMD/KSNDMC Rainfall | **Yes** (Official Government Datasets) | **Yes** (Trained Random Forest model + CSV datasets in `data/processed/`) | **Dynamic** (Trained ML pipeline with district benchmarks fallback) | **Status: Complete.** Already integrated in previous phase. Must be kept intact and preserved. |
| **2. Fertilizer Intelligence** | UAS Raichur & ICAR Package of Practices, SoilGrids (ISRIC), Soil Health Card Benchmarks | **Partially Official** (UAS Raichur & ICAR POP are official university guidelines; SoilGrids is 3rd-party modelled) | **Yes** (`fertilizerRecommendationService.js` and `soilController.js`) | **Dynamic** (Calculates commercial product bag counts for farmer's landholding) | Ground nutrient requirements in ICAR/UAS Raichur Package of Practices; add Sujala-3 Land Resource Inventory (LRI) fertility benchmarks; explicitly tag SoilGrids as modeled 3rd-party data vs official lab test. |
| **3. Irrigation Intelligence** | Open-Meteo & OpenWeather forecast heuristics + crop stage rules | **Heuristic / Live API** (Weather API is live; irrigation thresholds are heuristic) | **Yes** (`irrigationRecommendationService.js`) | **Dynamic** (Evaluates 24h rainfall probability & crop stage) | Integrate official **ICAR & FAO-56 Crop Evapotranspiration ($ET_c = ET_0 \times K_c$)** coefficients for Karnataka crops; incorporate Sujala-3 LRI soil-water holding capacity; state clearly that sensor readings are not fabricated. |
| **4. Disease Detection** | MobileNetV2 (PlantVillage dataset) + Pl@ntNet API | **Open Academic / International Research** (PlantVillage by Penn State; Pl@ntNet by CIRAD/INRAE) | **Yes** (`diseaseController.js` with local ML endpoint & Pl@ntNet fallback) | **Dynamic** (Analyzes uploaded leaf image) | Enrich disease advisory with verified **ICAR-CRIDA / ICAR-IARI & UAS Raichur / Dharwad plant pathology management practices** (cultural, biological, and CIBRC-registered chemical treatments); display disclaimer stating AI screening requires field confirmation. |
| **5. Government Schemes** | myScheme.gov.in, Karnataka Department of Agriculture, PM-KISAN, PMFBY, FRUITS portal | **Yes** (Official Central & Karnataka Portals) | **Yes** (`governmentSchemesService.js` and `schemeController.js`) | **Dynamic** (Matches eligibility against farmer district, landholding, and crop) | Centralize raw official scheme metadata in `data/government/schemes/`; display last-verified date and explicit disclaimer that AgriSaarthi cannot guarantee approval. |
| **6. Agricultural Expert Directory** | Karnataka Department of Agriculture (agri.karnataka.gov.in) & ICAR-ATARI KVK Directory | **Yes** (Official State & ICAR Directories) | **Yes** (`agriculturalOfficersService.js` and `officerController.js`) | **Dynamic** (Filters by farmer's district & taluk) | Store verified directory in `data/government/agricultural_research/officers_directory.json`; include direct contact details for RSK AAOs, KVKs, and toll-free Kisan Call Center (1800-180-1551). Never display fictitious personnel. |
| **7. Weather Intelligence** | Open-Meteo API, OpenWeather API, IMD Normal Rainfall Series | **Live API + Official Normals** (Open-Meteo is live meteorological; IMD normals are official GOI) | **Yes** (`weatherService.js` and `weatherController.js`) | **Dynamic** (Live GPS coordinates with IMD benchmark comparison) | Clearly distinguish real-time meteorological API data from official IMD historical normal benchmarks. Preserve live weather functionality. |
| **8. Market Intelligence** | `mandi-api.onrender.com` (Agmarknet mirror/proxy) | **Third-Party Proxy of Official Govt Data** (Agmarknet is DAC&FW) | **Yes** (`marketPriceService.js`) | **Dynamic** (Cached API queries with offline memory fallback) | Add explicit provenance disclaimer: "Aggregated via Agmarknet public market bulletin service". |
| **9. Farm Digital Twin & Cadastral** | OpenStreetMap, Esri World Imagery, Turf.js geodesic algorithms | **Standard Geospatial / Cartographic Data** | **Yes** (`DigitalTwinDashboard.jsx`, `FarmSetup.jsx`, `FarmLocationMap.jsx`) | **Dynamic** (Plot boundaries, area calculation in Acres & Hectares) | Reference Karnataka Bhoomi / Sujala-3 cadastral boundary guidelines. |
| **10. Farming Calendar** | UAS Raichur & ICAR Package of Practices for Cotton, Paddy, Chickpea, Maize | **Yes** (Official Agricultural University POP) | **Yes** (`farmingCalendarService.js` and `FarmingCalendarPanel.jsx`) | **Dynamic** (Generates day offsets from farmer's actual sowing date) | Store raw POP research publications in `data/government/agricultural_research/` and tag sources. |

---

## 2. Key Deficiencies Identified & Remediation Plan

1. **Centralized Data Storage Missing:** Government datasets, university POP guidelines, and scheme registries were distributed across JS code rather than organized under a standard `data/government/` directory.
2. **Provenance Transparency:** The UI did not always display a distinct badge for **Official Government Data**, **University Research POP**, **Live Meteorological API**, and **Model-Generated Prediction**.
3. **Irrigation Scientific Grounding:** Irrigation recommendations used simple rain heuristics without the official **ICAR / FAO-56 Crop Water Requirement ($K_c$)** coefficients for Karnataka agro-climatic zones.
4. **Disease Treatment Verification:** Plant disease treatments needed explicit citation of **ICAR-IARI & UAS Dharwad/Raichur Plant Pathology Package of Practices** and CIBRC safety guidelines.
5. **Government Portal Verification:** Explicit provenance, last-verified dates, and legal disclaimers must be presented on all scheme cards and expert listings.
