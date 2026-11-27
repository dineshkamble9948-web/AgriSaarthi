"""
AgriSaarthi Karnataka Agricultural Knowledge & Regional Recommendation Engine
Integrates official Karnataka Soil Health, Meteorological Rainfall, and District Crop Production datasets.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"

_SOIL_DF: pd.DataFrame | None = None
_RAIN_DF: pd.DataFrame | None = None
_CROP_PROD_DF: pd.DataFrame | None = None

# Known agronomic ranges for the 22 crops in the ML model
CROP_AGRONOMIC_PROFILES: dict[str, dict[str, Any]] = {
    "rice": {
        "canonical_name": "Rice (Paddy)",
        "seasons": ["Kharif", "Summer"],
        "n_range": (60, 100),
        "p_range": (35, 65),
        "k_range": (30, 50),
        "ph_range": (5.5, 7.2),
        "rainfall_range_mm": (1000, 2500),
        "temp_range_c": (20, 35),
        "soil_types": ["Clay", "Clay Loam", "Alluvial", "Black"],
        "description": "High water requirement cereal; highly productive in canal-irrigated command areas and coastal tracts of Karnataka."
    },
    "maize": {
        "canonical_name": "Maize (Corn)",
        "seasons": ["Kharif", "Rabi", "Summer"],
        "n_range": (60, 100),
        "p_range": (35, 60),
        "k_range": (15, 30),
        "ph_range": (5.5, 7.5),
        "rainfall_range_mm": (500, 1100),
        "temp_range_c": (18, 32),
        "soil_types": ["Red Loam", "Medium Black", "Alluvial", "Sandy Loam"],
        "description": "Widely adaptable kharif and rabi cereal across central and northern Karnataka with excellent yield potential."
    },
    "chickpea": {
        "canonical_name": "Chickpea (Bengal Gram / Chana)",
        "seasons": ["Rabi"],
        "n_range": (20, 60),
        "p_range": (55, 80),
        "k_range": (70, 90),
        "ph_range": (6.0, 8.5),
        "rainfall_range_mm": (400, 800),
        "temp_range_c": (15, 25),
        "soil_types": ["Black Soil", "Clay Loam", "Medium Black"],
        "description": "Major post-monsoon pulse in Northern Karnataka; thrives in moisture-retentive black soils with alkaline pH."
    },
    "pigeonpeas": {
        "canonical_name": "Pigeonpeas (Red Gram / Tur)",
        "seasons": ["Kharif"],
        "n_range": (15, 40),
        "p_range": (55, 80),
        "k_range": (15, 30),
        "ph_range": (5.5, 7.5),
        "rainfall_range_mm": (600, 1000),
        "temp_range_c": (20, 35),
        "soil_types": ["Medium Black", "Deep Black", "Red Sandy Loam"],
        "description": "Deep-rooted drought-hardy pulse; key cash pulse of the Kalaburagi/Raichur 'Pulse Bowl' of Karnataka."
    },
    "cotton": {
        "canonical_name": "Cotton",
        "seasons": ["Kharif"],
        "n_range": (100, 140),
        "p_range": (35, 60),
        "k_range": (15, 30),
        "ph_range": (6.0, 8.5),
        "rainfall_range_mm": (600, 1200),
        "temp_range_c": (21, 35),
        "soil_types": ["Deep Black", "Medium Black"],
        "description": "Premier commercial fiber crop of Northern Karnataka black soil plains requiring high nitrogen and warm conditions."
    },
    "groundnut": {
        "canonical_name": "Groundnut (Peanut)",
        "seasons": ["Kharif", "Summer"],
        "n_range": (15, 40),
        "p_range": (35, 60),
        "k_range": (15, 30),
        "ph_range": (5.5, 7.2),
        "rainfall_range_mm": (500, 950),
        "temp_range_c": (22, 32),
        "soil_types": ["Red Sandy Loam", "Light Loam"],
        "description": "Valuable oilseed flourishing in well-drained, friable red sandy loam soils across Chitradurga, Tumakuru, and Ballari."
    },
    "banana": {
        "canonical_name": "Banana",
        "seasons": ["Whole Year", "Kharif"],
        "n_range": (80, 120),
        "p_range": (70, 95),
        "k_range": (45, 60),
        "ph_range": (5.8, 7.5),
        "rainfall_range_mm": (900, 1600),
        "temp_range_c": (20, 35),
        "soil_types": ["Clay Loam", "Alluvial", "Red Sandy Loam"],
        "description": "High-value perennial horticultural crop requiring fertile soils, abundant potassium, and reliable irrigation."
    },
    "pomegranate": {
        "canonical_name": "Pomegranate",
        "seasons": ["Whole Year", "Rabi", "Summer"],
        "n_range": (15, 30),
        "p_range": (15, 25),
        "k_range": (35, 50),
        "ph_range": (6.5, 8.2),
        "rainfall_range_mm": (500, 900),
        "temp_range_c": (20, 35),
        "soil_types": ["Light Loam", "Medium Black", "Red Loam"],
        "description": "High-value fruit suited to dry semi-arid conditions of Bagalkot, Vijayapura, Ballari, and Koppal."
    },
    "mango": {
        "canonical_name": "Mango",
        "seasons": ["Whole Year"],
        "n_range": (15, 30),
        "p_range": (20, 35),
        "k_range": (25, 40),
        "ph_range": (5.5, 7.5),
        "rainfall_range_mm": (600, 1200),
        "temp_range_c": (24, 38),
        "soil_types": ["Red Loamy", "Alluvial"],
        "description": "Perennial orchard crop widely cultivated in Kolar, Chikkaballapura, Ramanagara, and Dharwad belts."
    },
    "grapes": {
        "canonical_name": "Grapes",
        "seasons": ["Rabi", "Summer"],
        "n_range": (15, 35),
        "p_range": (120, 145),
        "k_range": (190, 215),
        "ph_range": (6.0, 7.8),
        "rainfall_range_mm": (500, 900),
        "temp_range_c": (15, 32),
        "soil_types": ["Red Sandy Loam", "Medium Black"],
        "description": "Intensive commercial horticulture crop thriving in Vijayapura, Bagalkot, and Bengaluru Rural climates."
    },
    "watermelon": {
        "canonical_name": "Watermelon",
        "seasons": ["Summer", "Zaid"],
        "n_range": (80, 120),
        "p_range": (15, 30),
        "k_range": (45, 60),
        "ph_range": (6.0, 7.2),
        "rainfall_range_mm": (400, 700),
        "temp_range_c": (22, 35),
        "soil_types": ["Sandy Loam", "Alluvial"],
        "description": "Quick-maturing warm season riverbed and irrigated field crop suitable for summer income."
    },
    "muskmelon": {
        "canonical_name": "Muskmelon",
        "seasons": ["Summer", "Zaid"],
        "n_range": (85, 120),
        "p_range": (15, 25),
        "k_range": (45, 60),
        "ph_range": (6.0, 7.2),
        "rainfall_range_mm": (400, 650),
        "temp_range_c": (24, 36),
        "soil_types": ["Sandy Loam", "Light Red Loam"],
        "description": "High-sugar summer cucurbit requiring warm days, cool nights, and well-drained soils."
    },
    "blackgram": {
        "canonical_name": "Blackgram (Urad)",
        "seasons": ["Kharif", "Rabi"],
        "n_range": (20, 50),
        "p_range": (55, 80),
        "k_range": (15, 30),
        "ph_range": (6.5, 7.8),
        "rainfall_range_mm": (600, 900),
        "temp_range_c": (25, 35),
        "soil_types": ["Medium Black", "Clay Loam"],
        "description": "Short-duration pulse crop ideal for crop rotation and soil nitrogen enrichment across Karnataka."
    },
    "mungbean": {
        "canonical_name": "Mungbean (Green Gram / Moong)",
        "seasons": ["Kharif", "Summer"],
        "n_range": (15, 35),
        "p_range": (35, 60),
        "k_range": (15, 30),
        "ph_range": (6.2, 7.5),
        "rainfall_range_mm": (500, 800),
        "temp_range_c": (25, 35),
        "soil_types": ["Sandy Loam", "Medium Black"],
        "description": "Quick 60-day pulse crop; early kharif catch-crop widely sown in Northern Karnataka."
    },
    "mothbeans": {
        "canonical_name": "Mothbeans (Matki)",
        "seasons": ["Kharif"],
        "n_range": (15, 35),
        "p_range": (35, 60),
        "k_range": (15, 30),
        "ph_range": (6.0, 7.5),
        "rainfall_range_mm": (350, 650),
        "temp_range_c": (25, 38),
        "soil_types": ["Sandy Loam", "Red Soil"],
        "description": "Exceptionally drought-tolerant arid pulse suited to low rainfall regions."
    },
    "lentil": {
        "canonical_name": "Lentil (Masoor)",
        "seasons": ["Rabi"],
        "n_range": (15, 35),
        "p_range": (55, 80),
        "k_range": (15, 30),
        "ph_range": (6.0, 7.5),
        "rainfall_range_mm": (400, 700),
        "temp_range_c": (15, 25),
        "soil_types": ["Clay Loam", "Alluvial", "Black"],
        "description": "Cool-season rabi pulse suited for winter moisture residual cultivation."
    },
    "kidneybeans": {
        "canonical_name": "Kidneybeans (Rajma)",
        "seasons": ["Rabi", "Kharif"],
        "n_range": (15, 35),
        "p_range": (55, 80),
        "k_range": (15, 30),
        "ph_range": (5.5, 6.8),
        "rainfall_range_mm": (650, 1100),
        "temp_range_c": (15, 26),
        "soil_types": ["Well Drained Loam", "Hill Soils"],
        "description": "Nutritious legume requiring mild temperatures, suited to Malnad and high-elevation transitional zones."
    },
    "orange": {
        "canonical_name": "Orange (Citrus / Mandarin)",
        "seasons": ["Whole Year"],
        "n_range": (15, 30),
        "p_range": (10, 25),
        "k_range": (8, 20),
        "ph_range": (6.0, 7.5),
        "rainfall_range_mm": (900, 1300),
        "temp_range_c": (18, 30),
        "soil_types": ["Deep Loamy", "Red Sandy Loam"],
        "description": "Subtropical fruit; famous Kodagu Coorg mandarin citrus belt in Southern Karnataka."
    },
    "papaya": {
        "canonical_name": "Papaya",
        "seasons": ["Whole Year"],
        "n_range": (40, 65),
        "p_range": (50, 70),
        "k_range": (40, 60),
        "ph_range": (6.0, 7.2),
        "rainfall_range_mm": (800, 1600),
        "temp_range_c": (22, 35),
        "soil_types": ["Well-Drained Loam", "Alluvial"],
        "description": "Fast-growing high-yield tropical fruit; requires good drainage as waterlogging causes root rot."
    },
    "coconut": {
        "canonical_name": "Coconut",
        "seasons": ["Whole Year"],
        "n_range": (15, 35),
        "p_range": (10, 25),
        "k_range": (25, 45),
        "ph_range": (5.2, 7.5),
        "rainfall_range_mm": (1200, 2500),
        "temp_range_c": (22, 34),
        "soil_types": ["Coastal Sand", "Lateritic", "Alluvial", "Red Sandy Loam"],
        "description": "Major plantation palm spanning Coastal Karnataka (Udupi/Dakshina Kannada) and southern plains (Tumakuru/Hassan/Mandya)."
    },
    "coffee": {
        "canonical_name": "Coffee (Arabica & Robusta)",
        "seasons": ["Whole Year"],
        "n_range": (80, 120),
        "p_range": (20, 40),
        "k_range": (20, 40),
        "ph_range": (5.5, 6.8),
        "rainfall_range_mm": (1400, 2500),
        "temp_range_c": (18, 28),
        "soil_types": ["Deep Lateritic", "Forest Humus Rich Loam"],
        "description": "Flagship commercial plantation crop of Karnataka (Kodagu, Chikkamagaluru, Hassan); produces over 70% of India's coffee."
    },
    "jute": {
        "canonical_name": "Jute",
        "seasons": ["Kharif"],
        "n_range": (65, 95),
        "p_range": (35, 60),
        "k_range": (30, 50),
        "ph_range": (6.0, 7.4),
        "rainfall_range_mm": (1200, 1900),
        "temp_range_c": (24, 36),
        "soil_types": ["Alluvial Loam", "Clay Loam"],
        "description": "High-humidity bast fiber crop requiring wet soils and warm weather."
    }
}


def _load_data():
    global _SOIL_DF, _RAIN_DF, _CROP_PROD_DF
    if _SOIL_DF is None:
        soil_file = PROCESSED_DATA_DIR / "clean_soil_data.csv"
        if soil_file.is_file():
            _SOIL_DF = pd.read_csv(soil_file)
    if _RAIN_DF is None:
        rain_file = PROCESSED_DATA_DIR / "clean_rainfall.csv"
        if rain_file.is_file():
            _RAIN_DF = pd.read_csv(rain_file)
    if _CROP_PROD_DF is None:
        crop_file = PROCESSED_DATA_DIR / "clean_crop_production.csv"
        if crop_file.is_file():
            _CROP_PROD_DF = pd.read_csv(crop_file)


def list_karnataka_districts() -> list[str]:
    _load_data()
    if _SOIL_DF is not None and not _SOIL_DF.empty:
        return sorted(_SOIL_DF["district"].dropna().unique().tolist())
    return [
        "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban",
        "Bidar", "Chamarajanagar", "Chikkaballapura", "Chikkamagaluru", "Chitradurga",
        "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan",
        "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal",
        "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
        "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir", "Vijayanagara"
    ]


def list_karnataka_taluks(district: str) -> list[str]:
    _load_data()
    dist_norm = str(district).strip()
    if _RAIN_DF is not None and not _RAIN_DF.empty:
        matched = _RAIN_DF[_RAIN_DF["district"].str.lower() == dist_norm.lower()]
        if not matched.empty:
            taluks = sorted(matched["taluk"].dropna().unique().tolist())
            if taluks:
                return taluks
    if _SOIL_DF is not None and not _SOIL_DF.empty:
        matched = _SOIL_DF[_SOIL_DF["district"].str.lower() == dist_norm.lower()]
        taluks = [t for t in matched["taluk"].dropna().unique().tolist() if "Average" not in t and "Benchmark" not in t]
        if taluks:
            return sorted(taluks)
    return ["Taluk Headquarter"]


def get_regional_soil_profile(district: str, taluk: str | None = None) -> dict[str, Any]:
    _load_data()
    dist_norm = str(district).strip().lower()
    taluk_norm = str(taluk).strip().lower() if taluk else None

    if _SOIL_DF is None or _SOIL_DF.empty:
        return {
            "nitrogen_kg_ha": 240.0, "phosphorus_kg_ha": 22.0, "potassium_kg_ha": 220.0,
            "ph": 6.8, "organic_carbon_percent": 0.55, "sulphur_ppm": 15.0,
            "zinc_ppm": 0.70, "iron_ppm": 6.0, "boron_ppm": 0.50, "copper_ppm": 1.2, "manganese_ppm": 7.5,
            "soil_type": "Red Loam", "data_level": "State Default", "provenance": "Fallback Baseline"
        }

    matched = _SOIL_DF[_SOIL_DF["district"].str.lower() == dist_norm]
    if matched.empty:
        matched = _SOIL_DF

    row = None
    if taluk_norm:
        taluk_match = matched[matched["taluk"].str.lower() == taluk_norm]
        if not taluk_match.empty:
            row = taluk_match.iloc[0]

    if row is None:
        bench_match = matched[matched["data_level"] == "District Benchmark"]
        row = bench_match.iloc[0] if not bench_match.empty else matched.iloc[0]

    n_val = float(row.get("nitrogen_kg_ha", 240.0))
    p_val = float(row.get("phosphorus_kg_ha", 22.0))
    k_val = float(row.get("potassium_kg_ha", 220.0))
    ph_val = float(row.get("ph", 6.8))
    oc_val = float(row.get("organic_carbon_percent", 0.55))
    s_val = float(row.get("sulphur_ppm", 15.0))
    zn_val = float(row.get("zinc_ppm", 0.70))
    fe_val = float(row.get("iron_ppm", 6.0))
    b_val = float(row.get("boron_ppm", 0.50))
    cu_val = float(row.get("copper_ppm", 1.2))
    mn_val = float(row.get("manganese_ppm", 7.5))

    # Deficiencies detection based on ICAR standards
    deficiencies = []
    advisories = []
    if zn_val < 0.6:
        deficiencies.append("Zinc (Zn)")
        advisories.append("Soil is deficient in Zinc (<0.6 ppm). Apply 25 kg/ha Zinc Sulphate (ZnSO₄) to basal soil before sowing.")
    if b_val < 0.5:
        deficiencies.append("Boron (B)")
        advisories.append("Boron level is below critical threshold (<0.5 ppm). Apply 10 kg/ha Borax (or 0.2% foliar spray at flowering).")
    if s_val < 10.0:
        deficiencies.append("Sulphur (S)")
        advisories.append("Low Sulphur content (<10 ppm). Apply gypsum (100 kg/ha) or sulphur-containing fertilizers.")
    if oc_val < 0.5:
        deficiencies.append("Organic Carbon")
        advisories.append("Low organic carbon (<0.5%). Incorporate 8-10 tonnes/ha Farm Yard Manure (FYM) or green manure crops.")
    if ph_val < 6.0:
        advisories.append("Acidic soil (pH <6.0). Apply agricultural lime or dolomite based on lime requirement tests.")
    elif ph_val > 8.0:
        advisories.append("Alkaline calcareous soil (pH >8.0). Apply gypsum and maintain organic matter to improve micronutrient uptake.")

    return {
        "state": "Karnataka",
        "district": str(row.get("district", district)),
        "taluk": str(row.get("taluk", taluk or "All Taluks")),
        "nitrogen_kg_ha": n_val,
        "phosphorus_kg_ha": p_val,
        "potassium_kg_ha": k_val,
        "ph": ph_val,
        "organic_carbon_percent": oc_val,
        "sulphur_ppm": s_val,
        "zinc_ppm": zn_val,
        "iron_ppm": fe_val,
        "boron_ppm": b_val,
        "copper_ppm": cu_val,
        "manganese_ppm": mn_val,
        "soil_type": str(row.get("soil_type", "Red Loam")),
        "nitrogen_status": str(row.get("nitrogen_status", "Medium (280-560)")),
        "phosphorus_status": str(row.get("phosphorus_status", "Medium (10-25)")),
        "potassium_status": str(row.get("potassium_status", "High (>280)")),
        "ph_status": str(row.get("ph_status", "Neutral (6.5-7.5)")),
        "oc_status": str(row.get("oc_status", "Medium (0.5-0.75%)")),
        "deficiencies": deficiencies,
        "soil_health_advisories": advisories,
        "data_level": str(row.get("data_level", "District Benchmark")),
        "source": str(row.get("source", "DAC&FW Soil Health Card Portal"))
    }


def get_regional_rainfall(district: str, taluk: str | None = None) -> dict[str, Any]:
    _load_data()
    dist_norm = str(district).strip().lower()
    taluk_norm = str(taluk).strip().lower() if taluk else None

    if _RAIN_DF is None or _RAIN_DF.empty:
        return {
            "annual_rainfall_mm": 750.0,
            "kharif_rainfall_mm": 480.0,
            "rabi_rainfall_mm": 180.0,
            "summer_rainfall_mm": 70.0,
            "winter_rainfall_mm": 20.0,
            "rainfall_zone": "Semi-Arid (600-1000mm)"
        }

    matched = _RAIN_DF[_RAIN_DF["district"].str.lower() == dist_norm]
    if matched.empty:
        matched = _RAIN_DF

    row = None
    if taluk_norm:
        taluk_match = matched[matched["taluk"].str.lower() == taluk_norm]
        if not taluk_match.empty:
            row = taluk_match.iloc[0]

    if row is None:
        row = matched.iloc[0]

    return {
        "district": str(row.get("district", district)),
        "taluk": str(row.get("taluk", taluk or "All Taluks")),
        "annual_rainfall_mm": float(row.get("annual_rainfall_mm", 750.0)),
        "kharif_rainfall_mm": float(row.get("kharif_rainfall_mm", 480.0)),
        "rabi_rainfall_mm": float(row.get("rabi_rainfall_mm", 180.0)),
        "summer_rainfall_mm": float(row.get("summer_rainfall_mm", 70.0)),
        "winter_rainfall_mm": float(row.get("winter_rainfall_mm", 20.0)),
        "rainfall_zone": str(row.get("rainfall_zone", "Semi-Arid (600-1000mm)"))
    }


def get_district_crop_historical_production(district: str) -> dict[str, dict[str, Any]]:
    _load_data()
    dist_norm = str(district).strip().lower()
    if _CROP_PROD_DF is None or _CROP_PROD_DF.empty:
        return {}

    dist_crops = _CROP_PROD_DF[_CROP_PROD_DF["district"].str.lower() == dist_norm]
    if dist_crops.empty:
        return {}

    stats = {}
    for crop_name, group in dist_crops.groupby("canonical_crop"):
        total_prod = float(group["production_tonnes"].sum())
        total_area = float(group["area_ha"].sum())
        avg_yield = round(total_prod / total_area, 2) if total_area > 0 else 0.0
        seasons = group["season"].dropna().unique().tolist()
        stats[crop_name.lower()] = {
            "total_production_tonnes": total_prod,
            "total_area_ha": total_area,
            "avg_yield_tonnes_ha": avg_yield,
            "seasons": seasons
        }
    return stats


def enhance_crop_recommendation(
    ml_recommendations: list[dict[str, Any]],
    district: str | None = None,
    taluk: str | None = None,
    season: str | None = None,
    user_inputs: dict[str, Any] | None = None,
    is_actual_soil_test: bool = False
) -> dict[str, Any]:
    """
    Combines ML Random Forest model outputs with official Karnataka Government Agricultural Knowledge:
    - Regional production records (Directorate of Economics & Statistics)
    - Regional rainfall suitability (IMD & KSNDMC)
    - Soil Health Card actual vs regional benchmark parameters
    """
    district_clean = district.strip() if district else "Karnataka (General)"
    soil_profile = get_regional_soil_profile(district_clean, taluk)
    rain_profile = get_regional_rainfall(district_clean, taluk)
    prod_stats = get_district_crop_historical_production(district_clean)

    # Active parameters available
    effective_n = float(user_inputs.get("N", soil_profile["nitrogen_kg_ha"])) if user_inputs else soil_profile["nitrogen_kg_ha"]
    effective_p = float(user_inputs.get("P", soil_profile["phosphorus_kg_ha"])) if user_inputs else soil_profile["phosphorus_kg_ha"]
    effective_k = float(user_inputs.get("K", soil_profile["potassium_kg_ha"])) if user_inputs else soil_profile["potassium_kg_ha"]
    effective_ph = float(user_inputs.get("ph", soil_profile["ph"])) if user_inputs else soil_profile["ph"]
    effective_rainfall = float(user_inputs.get("rainfall", rain_profile["annual_rainfall_mm"])) if user_inputs else rain_profile["annual_rainfall_mm"]

    selected_season = season.strip().title() if season else "Kharif"

    scored_crops = []
    for candidate in ml_recommendations:
        crop_id = candidate["crop"].lower().strip()
        profile = CROP_AGRONOMIC_PROFILES.get(crop_id, {
            "canonical_name": candidate["crop"].title(),
            "seasons": ["Kharif", "Rabi"],
            "n_range": (30, 100),
            "p_range": (20, 60),
            "k_range": (20, 60),
            "ph_range": (5.5, 7.8),
            "rainfall_range_mm": (500, 1200),
            "description": "Agronomically screened agricultural crop."
        })

        ml_score = float(candidate.get("score_percent", 50.0))

        # 1. Soil Suitability Score
        n_low, n_high = profile["n_range"]
        p_low, p_high = profile["p_range"]
        k_low, k_high = profile["k_range"]
        ph_low, ph_high = profile["ph_range"]
        rain_low, rain_high = profile["rainfall_range_mm"]

        def range_match(val, r_low, r_high):
            if r_low <= val <= r_high:
                return 1.0
            diff = min(abs(val - r_low), abs(val - r_high))
            span = max(r_high - r_low, 1.0)
            return max(0.2, 1.0 - (diff / span))

        n_match = range_match(effective_n, n_low, n_high)
        p_match = range_match(effective_p, p_low, p_high)
        k_match = range_match(effective_k, k_low, k_high)
        ph_match = range_match(effective_ph, ph_low, ph_high)
        soil_score = (n_match * 0.25 + p_match * 0.25 + k_match * 0.25 + ph_match * 0.25) * 100

        # 2. Rainfall Suitability
        rain_match = range_match(effective_rainfall, rain_low, rain_high)
        rainfall_score = rain_match * 100

        # 3. Seasonal Compatibility
        season_match = 1.0 if selected_season in profile["seasons"] or "Whole Year" in profile["seasons"] else 0.4

        # 4. Regional Production Provenance (DES Karnataka census)
        crop_hist = prod_stats.get(crop_id)
        if crop_hist and crop_hist["total_production_tonnes"] > 5000:
            regional_provenance = "Widely Cultivated (Proven District Track Record)"
            regional_bonus = 15.0
        elif crop_hist and crop_hist["total_production_tonnes"] > 0:
            regional_provenance = "Moderate Cultivation in District"
            regional_bonus = 8.0
        else:
            regional_provenance = "Limited / Specialized Cultivation in District"
            regional_bonus = 0.0

        # Calibrated composite score (45% ML Random Forest + 25% Soil Nutrient Fit + 15% Rainfall Fit + 15% Season/Region)
        composite_score = (
            (ml_score * 0.45) +
            (soil_score * 0.25) +
            (rainfall_score * 0.15) +
            ((season_match * 100) * 0.15) +
            regional_bonus
        )
        final_score = min(99.0, max(25.0, round(composite_score, 1)))

        # Formulate clear agricultural explanation
        reasons = []
        if ph_low <= effective_ph <= ph_high:
            reasons.append(f"Soil pH {effective_ph:.1f} is optimal for {profile['canonical_name']} (favorable range {ph_low}-{ph_high}).")
        else:
            reasons.append(f"Soil pH {effective_ph:.1f} is slightly outside ideal {ph_low}-{ph_high}, requiring pH balancing.")

        if rain_low <= effective_rainfall <= rain_high:
            reasons.append(f"Rainfall {effective_rainfall:.0f} mm matches natural crop water demand.")
        elif effective_rainfall < rain_low:
            reasons.append(f"Rainfall {effective_rainfall:.0f} mm is below ideal {rain_low} mm; supplemental irrigation is recommended.")
        else:
            reasons.append(f"Rainfall {effective_rainfall:.0f} mm is generous; ensure good field drainage.")

        if crop_hist and crop_hist["total_production_tonnes"] > 10000:
            reasons.append(f"Strong regional track record in {district_clean} with historical average yield of {crop_hist['avg_yield_tonnes_ha']} t/ha.")
        elif regional_provenance == "Limited / Specialized Cultivation in District":
            reasons.append(f"Agronomically compatible, though historical production in {district_clean} is low or specialized.")

        scored_crops.append({
            "crop": candidate["crop"],
            "canonical_name": profile["canonical_name"],
            "suitability_score": final_score,
            "ml_model_score": ml_score,
            "suitable_seasons": profile["seasons"],
            "active_season_match": bool(season_match >= 0.8),
            "regional_production_status": regional_provenance,
            "required_soil_conditions": {
                "nitrogen_range": f"{n_low}-{n_high} kg/ha",
                "phosphorus_range": f"{p_low}-{p_high} kg/ha",
                "potassium_range": f"{k_low}-{k_high} kg/ha",
                "ph_range": f"{ph_low}-{ph_high}",
                "rainfall_range": f"{rain_low}-{rain_high} mm"
            },
            "available_soil_conditions": {
                "nitrogen": f"{effective_n:.1f} kg/ha",
                "phosphorus": f"{effective_p:.1f} kg/ha",
                "potassium": f"{effective_k:.1f} kg/ha",
                "ph": f"{effective_ph:.1f}",
                "rainfall": f"{effective_rainfall:.0f} mm",
                "organic_carbon": f"{soil_profile['organic_carbon_percent']}%",
                "zinc_ppm": f"{soil_profile['zinc_ppm']} ppm",
                "provenance": "Farmer Actual Soil Test" if is_actual_soil_test else "Karnataka District/Taluk Benchmark"
            },
            "rainfall_suitability": (
                "Optimal Natural Rainfall" if rain_low <= effective_rainfall <= rain_high else
                "Moderate - Supplemental Irrigation Advised" if effective_rainfall < rain_low else
                "High Moisture - Ensure Field Drainage"
            ),
            "crop_description": profile["description"],
            "explanation": " ".join(reasons)
        })

    # Sort strictly by calibrated location-aware suitability score
    scored_crops.sort(key=lambda x: x["suitability_score"], reverse=True)
    top_three = scored_crops[:3]

    return {
        "success": True,
        "location": {
            "state": "Karnataka",
            "district": district_clean,
            "taluk": taluk or "All Taluks",
            "soil_type": soil_profile["soil_type"],
            "data_level": soil_profile["data_level"],
            "is_actual_soil_test": is_actual_soil_test
        },
        "selected_season": selected_season,
        "regional_soil_profile": soil_profile,
        "regional_rainfall_profile": rain_profile,
        "top_three_recommendations": top_three,
        "soil_health_deficiencies": soil_profile["deficiencies"],
        "soil_management_suggestions": soil_profile["soil_health_advisories"]
    }
