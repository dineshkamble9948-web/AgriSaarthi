from __future__ import annotations

from typing import Any


_CROPS: tuple[dict[str, Any], ...] = (
    {
        "name": "Rice",
        "soils": {"clay", "loamy", "alluvial"},
        "ph": (5.5, 7.5),
        "seasons": {"kharif"},
        "water": "high",
        "rainfall": (1000, 2500),
        "temperature": (20, 35),
    },
    {
        "name": "Maize",
        "soils": {"loamy", "black", "red", "alluvial"},
        "ph": (5.5, 7.5),
        "seasons": {"kharif", "rabi", "summer"},
        "water": "medium",
        "rainfall": (500, 1200),
        "temperature": (18, 32),
    },
    {
        "name": "Groundnut",
        "soils": {"sandy", "loamy", "red"},
        "ph": (5.5, 7.0),
        "seasons": {"kharif", "summer"},
        "water": "low",
        "rainfall": (500, 1000),
        "temperature": (20, 30),
    },
    {
        "name": "Cotton",
        "soils": {"black", "loamy", "alluvial"},
        "ph": (5.5, 8.0),
        "seasons": {"kharif"},
        "water": "medium",
        "rainfall": (500, 1200),
        "temperature": (21, 35),
    },
    {
        "name": "Wheat",
        "soils": {"loamy", "alluvial", "black"},
        "ph": (6.0, 7.5),
        "seasons": {"rabi"},
        "water": "medium",
        "rainfall": (300, 900),
        "temperature": (10, 25),
    },
    {
        "name": "Sorghum",
        "soils": {"black", "red", "loamy"},
        "ph": (5.5, 8.0),
        "seasons": {"kharif", "rabi"},
        "water": "low",
        "rainfall": (400, 900),
        "temperature": (20, 32),
    },
    {
        "name": "Pearl millet",
        "soils": {"sandy", "red", "loamy"},
        "ph": (5.5, 7.5),
        "seasons": {"kharif", "summer"},
        "water": "low",
        "rainfall": (250, 600),
        "temperature": (25, 35),
    },
)

_WEIGHTS = {
    "soil": 0.20,
    "ph": 0.20,
    "season": 0.18,
    "irrigation": 0.15,
    "rainfall": 0.15,
    "temperature": 0.12,
}


def _range_score(value: float, acceptable_range: tuple[float, float]) -> float:
    low, high = acceptable_range
    if low <= value <= high:
        return 1.0
    distance = low - value if value < low else value - high
    return max(0.0, 1.0 - distance / max(high - low, 1.0))


def _irrigation_score(availability: str, demand: str) -> float:
    scores = {
        "high": {"available": 1.0, "limited": 0.55, "none": 0.15},
        "medium": {"available": 1.0, "limited": 0.75, "none": 0.4},
        "low": {"available": 1.0, "limited": 0.9, "none": 0.7},
    }
    return scores[demand][availability]


def _score_crop(crop: dict[str, Any], inputs: dict[str, Any]) -> dict[str, Any]:
    soil_type = inputs["soil_type"].strip().lower()
    season = inputs["season"].strip().lower()
    irrigation = inputs["irrigation"].strip().lower()

    criteria = {
        "soil": (
            1.0 if soil_type in crop["soils"] else 0.35,
            f"Soil: {inputs['soil_type']} {'matches' if soil_type in crop['soils'] else 'is not a listed match for'} this crop's generic soil profile.",
        ),
        "ph": (
            _range_score(inputs["ph"], crop["ph"]),
            f"Soil pH {inputs['ph']:.1f} {'is within' if crop['ph'][0] <= inputs['ph'] <= crop['ph'][1] else 'is outside'} the screening range {crop['ph'][0]:.1f}-{crop['ph'][1]:.1f}.",
        ),
        "season": (
            1.0 if season in crop["seasons"] else 0.25,
            f"{inputs['season']} season {'is listed' if season in crop['seasons'] else 'is not listed'} for this crop.",
        ),
        "irrigation": (
            _irrigation_score(irrigation, crop["water"]),
            f"{inputs['irrigation']} irrigation availability is considered against the crop's generic {crop['water']} water-demand class.",
        ),
    }

    if inputs.get("rainfall_mm") is not None:
        rainfall_score = _range_score(inputs["rainfall_mm"], crop["rainfall"])
        criteria["rainfall"] = (
            rainfall_score,
            f"Rainfall {inputs['rainfall_mm']:.0f} mm is {'within' if crop['rainfall'][0] <= inputs['rainfall_mm'] <= crop['rainfall'][1] else 'outside'} the broad screening range {crop['rainfall'][0]}-{crop['rainfall'][1]} mm.",
        )

    if inputs.get("temperature_c") is not None:
        temperature_score = _range_score(inputs["temperature_c"], crop["temperature"])
        criteria["temperature"] = (
            temperature_score,
            f"Temperature {inputs['temperature_c']:.1f}°C is {'within' if crop['temperature'][0] <= inputs['temperature_c'] <= crop['temperature'][1] else 'outside'} the broad screening range {crop['temperature'][0]}-{crop['temperature'][1]}°C.",
        )

    weight_total = sum(_WEIGHTS[key] for key in criteria)
    score = sum(_WEIGHTS[key] * value[0] for key, value in criteria.items()) / weight_total
    reasons = [value[1] for value in criteria.values()]

    return {
        "crop": crop["name"],
        "suitability_score": round(score * 100),
        "score_type": "screening score, not a probability",
        "reasons": reasons,
        "matched_inputs": list(criteria),
        "generic_profile": {
            "soil_types": sorted(crop["soils"]),
            "ph_range": list(crop["ph"]),
            "seasons": sorted(crop["seasons"]),
            "water_demand": crop["water"],
        },
    }


def recommend_crops(inputs: dict[str, Any]) -> dict[str, Any]:
    recommendations = [_score_crop(crop, inputs) for crop in _CROPS]
    recommendations.sort(key=lambda item: (-item["suitability_score"], item["crop"]))

    nutrient_values = [
        inputs.get("nitrogen"),
        inputs.get("phosphorus"),
        inputs.get("potassium"),
    ]
    nutrient_note = (
        "NPK values were provided but are not used to rank crops: interpretation depends on the soil-test method, units, "
        "crop, and yield target. Use a calibrated soil test for nutrient planning."
        if any(value is not None for value in nutrient_values)
        else "NPK values were not provided. A calibrated soil test can improve later nutrient planning."
    )

    return {
        "success": True,
        "model_type": "transparent agronomic screening rules",
        "is_trained_ml": False,
        "recommendations": recommendations[:5],
        "data_notes": [
            "Scores rank generic screening profiles; they are not probabilities, yield forecasts, or guarantees.",
            "Profiles are broad and do not account for local varieties, soil-test calibration, pests, planting dates, or district-level advisories.",
            nutrient_note,
        ],
    }
