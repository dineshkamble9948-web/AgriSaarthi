import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createIrrigationRecommendation } from "../services/irrigationRecommendationService.js";
import { getRegionalSoilProfile } from "../services/karnatakaAgriculturalService.js";
import { getAllKarnatakaSchemes } from "../services/governmentSchemesService.js";
import { getOfficers } from "../services/agriculturalOfficersService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOV_DATA_DIR = path.resolve(__dirname, "../../data/government");

test("Government Integration: Centralized directory structure exists with required domains", () => {
  const domains = [
    "soil",
    "crops",
    "rainfall",
    "fertilizer",
    "irrigation",
    "disease",
    "schemes",
    "agricultural_research"
  ];

  for (const domain of domains) {
    const dirPath = path.join(GOV_DATA_DIR, domain);
    assert.ok(fs.existsSync(dirPath), `Domain directory ${domain} must exist`);
  }
});

test("Government Integration: Master Provenance Registry tracks all datasets with official metadata", () => {
  const registryPath = path.join(GOV_DATA_DIR, "MASTER_PROVENANCE_REGISTRY.json");
  assert.ok(fs.existsSync(registryPath), "MASTER_PROVENANCE_REGISTRY.json must exist");

  const raw = fs.readFileSync(registryPath, "utf-8");
  const registry = JSON.parse(raw);

  assert.ok(Array.isArray(registry.datasets));
  assert.ok(registry.datasets.length >= 8, "Must track at least 8 government datasets");

  for (const ds of registry.datasets) {
    assert.ok(ds.dataset_id, "Dataset must have unique ID");
    assert.ok(ds.department, "Dataset must attribute original government department");
    assert.ok(ds.source_url, "Dataset must specify original source URL");
    assert.ok(ds.license, "Dataset must state open access license / condition");
    assert.ok(ds.reliability_limitations, "Dataset must explicitly document limitations");
  }
});

test("Government Integration: Sujala-3 Land Resource Inventory benchmarks are available", () => {
  const lriPath = path.join(GOV_DATA_DIR, "soil/sujala3_lri_soil_benchmarks.json");
  assert.ok(fs.existsSync(lriPath), "Sujala-3 LRI file must exist");

  const data = JSON.parse(fs.readFileSync(lriPath, "utf-8"));
  assert.ok(data.soil_fertility_benchmarks.Raichur);
  assert.equal(data.soil_fertility_benchmarks.Raichur.soil_ph, 8.2);
  assert.ok(data.soil_fertility_benchmarks.Raichur.available_water_capacity_mm_m > 0);
});

test("Government Integration: UAS Raichur & ICAR Package of Practices norms are verified", () => {
  const popPath = path.join(GOV_DATA_DIR, "fertilizer/icar_uas_package_of_practices.json");
  assert.ok(fs.existsSync(popPath), "Package of practices file must exist");

  const data = JSON.parse(fs.readFileSync(popPath, "utf-8"));
  assert.ok(data.crops.cotton);
  assert.equal(data.crops.cotton.recommended_dose_npk_kg_acre.n, 60);
  assert.ok(data.crops.cotton.commercial_fertilizers_per_acre.some(f => f.product.includes("DAP")));
});

test("Government Integration: FAO-56 & ICAR Crop Water Requirements contain Kc and stage parameters", () => {
  const waterPath = path.join(GOV_DATA_DIR, "irrigation/icar_fao56_crop_water_requirements.json");
  assert.ok(fs.existsSync(waterPath), "Crop water requirements file must exist");

  const data = JSON.parse(fs.readFileSync(waterPath, "utf-8"));
  assert.ok(data.crop_coefficients.cotton);
  assert.ok(data.crop_coefficients.paddy);
  assert.ok(data.crop_coefficients.maize);
  assert.ok(data.crop_coefficients.chickpea);

  // Check method formula
  assert.ok(data.methodology.formula.includes("ETc = ETo * Kc"));
});

test("Government Integration: Irrigation recommendation service attaches FAO-56 agronomic model and provenance", () => {
  const rec = createIrrigationRecommendation({
    cropCycle: {
      cropName: "Cotton",
      currentStage: "Flowering"
    },
    weather: {
      hourly: [
        { rainfallMm: 0, precipitationProbabilityPercent: 10 }
      ]
    }
  });

  assert.ok(rec.agronomicWaterModel, "Must attach agronomicWaterModel");
  assert.equal(rec.agronomicWaterModel.cropCoefficientKc, 1.15);
  assert.equal(rec.agronomicWaterModel.isCriticalStage, true);
  assert.ok(rec.provenance.includes("ICAR-IIWM & FAO-56"));
});

test("Government Integration: Sujala-3 LRI parameters integrated into regional soil profile", () => {
  const profile = getRegionalSoilProfile("Raichur");
  assert.ok(profile.available_water_capacity_mm_m > 0);
  assert.ok(profile.dominant_soil_order.includes("Vertisol"));
  assert.ok(profile.land_capability_class.includes("Class"));
  assert.ok(profile.provenance.sujala3LRI);
});

test("Government Integration: Official Schemes and Agricultural Officers have active government citations", () => {
  const schemes = getAllKarnatakaSchemes();
  const pmKisan = schemes.find(s => s.id === "pm-kisan");
  assert.ok(pmKisan.officialWebsite.includes("pmkisan.gov.in"));

  const officers = getOfficers({ district: "Raichur" });
  assert.ok(officers.length > 0);
  const rsk = officers.find(o => o.category.includes("Kendra"));
  assert.ok(rsk);
  assert.ok(rsk.officeAddress);
});
