from __future__ import annotations

import io
import logging
import os
from typing import Any

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from PIL import Image, ImageOps

from model_utils import (
    FEATURES,
    MODEL_PATH as CROP_MODEL_PATH,
    load_model_bundle,
    predict_top_three,
)
from disease_detection import (
    is_disease_model_available,
    load_disease_model,
    predict_disease_mobilenet,
)
from karnataka_engine import (
    list_karnataka_districts,
    list_karnataka_taluks,
    get_regional_soil_profile,
    get_regional_rainfall,
    enhance_crop_recommendation,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AgriSaarthi ML Service",
    description="AI and ML services for smart agriculture",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MODEL_PATH")
MODEL_AVAILABLE = bool(MODEL_PATH and os.path.exists(MODEL_PATH))
MODEL_NAME = os.path.basename(MODEL_PATH) if MODEL_PATH else "No trained model checkpoint configured"
_crop_model_bundle: dict[str, Any] | None = None

INPUT_RANGES = {
    "N": {"minimum": 0, "maximum": 200},
    "P": {"minimum": 0, "maximum": 200},
    "K": {"minimum": 0, "maximum": 300},
    "temperature": {"minimum": -10, "maximum": 60},
    "humidity": {"minimum": 0, "maximum": 100},
    "ph": {"minimum": 0, "maximum": 14},
    "rainfall": {"minimum": 0, "maximum": 5000},
}


class CropRecommendationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    n: float = Field(alias="N", ge=0, le=200)
    p: float = Field(alias="P", ge=0, le=200)
    k: float = Field(alias="K", ge=0, le=300)
    temperature: float = Field(ge=-10, le=60)
    humidity: float = Field(ge=0, le=100)
    ph: float = Field(ge=0, le=14)
    rainfall: float = Field(ge=0, le=5000)
    district: str | None = None
    taluk: str | None = None
    season: str | None = None
    is_actual_soil_test: bool = False


def _get_crop_model() -> dict[str, Any]:
    global _crop_model_bundle

    if _crop_model_bundle is None:
        try:
            _crop_model_bundle = load_model_bundle(CROP_MODEL_PATH)
        except FileNotFoundError as error:
            raise HTTPException(status_code=503, detail="Crop model is not trained yet.") from error
        except (OSError, ValueError, KeyError) as error:
            logger.exception("Could not load crop recommendation model")
            raise HTTPException(status_code=500, detail="Crop model could not be loaded.") from error

    return _crop_model_bundle


def _image_to_rgb(image_bytes: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return ImageOps.exif_transpose(image)


def _heuristic_prediction(image: Image.Image) -> dict[str, Any]:
    rgb = np.array(image)
    r = float(np.mean(rgb[:, :, 0]))
    g = float(np.mean(rgb[:, :, 1]))
    b = float(np.mean(rgb[:, :, 2]))
    brightness = float(np.mean(np.mean(rgb, axis=2)))
    green_ratio = float(np.mean(rgb[:, :, 1] > 100))

    if green_ratio > 0.55 and brightness > 115:
        label = "Healthy leaf"
        confidence = 0.68
        crop = "General crop"
        symptoms = ["Leaf appears green and relatively uniform in tone."]
        guidance = "Continue current irrigation and nutrient management routine. Review field regularly for early stress signs."
    elif b > 140 and g < 130:
        label = "Nutrient stress"
        confidence = 0.61
        crop = "General crop"
        symptoms = ["Leaf color suggests stress or nutrient imbalance.", "Yellowing or pale patches may indicate deficiency."]
        guidance = "Check soil nutrient levels and consider a laboratory soil test before adding fertilizer. Avoid over-application."
    elif r > 135 and g < 110:
        label = "Leaf spot / blight risk"
        confidence = 0.72
        crop = "General crop"
        symptoms = ["Brown or dark lesions are consistent with disease pressure.", "Lower leaves may show early infection symptoms."]
        guidance = "Isolate the affected leaves, avoid overhead watering, and monitor disease spread. Seek agronomic advice if symptoms intensify."
    else:
        label = "Unknown / low confidence"
        confidence = 0.48
        crop = "General crop"
        symptoms = ["The image does not strongly match a known disease pattern."]
        guidance = "A field inspection and laboratory confirmation are recommended before applying a treatment."

    return {
        "prediction": label,
        "confidence": round(confidence, 2),
        "crop": crop,
        "symptoms": symptoms,
        "recommendation": guidance,
        "prediction_source": "heuristic_fallback",
        "model_loaded": False,
        "model_name": MODEL_NAME,
        "status": "Low-confidence heuristic fallback. A trained model is not loaded in this environment.",
        "channels": {"mean_r": round(r, 2), "mean_g": round(g, 2), "mean_b": round(b, 2), "brightness": round(brightness, 2)},
    }


@app.get("/")
def home() -> dict[str, Any]:
    return {
        "message": "Welcome to AgriSaarthi ML Service",
        "status": "Running",
        "crop_model_loaded": CROP_MODEL_PATH.is_file(),
        "disease_model_loaded": is_disease_model_available(),
        "disease_model_architecture": "MobileNetV2 (PlantVillage 38 Classes)" if is_disease_model_available() else "Heuristic Fallback",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "success": True,
        "service": "ML Service",
        "message": "Python ML service is working",
        "crop_model_loaded": CROP_MODEL_PATH.is_file(),
        "disease_model_loaded": is_disease_model_available(),
        "disease_model_name": "MobileNetV2 PlantVillage Pretrained" if is_disease_model_available() else "Heuristic Fallback",
    }


@app.get("/model-info")
def model_info() -> dict[str, Any]:
    bundle = _get_crop_model()
    metadata = bundle["metadata"]
    return {
        "success": True,
        "model_type": metadata["model_type"],
        "features": FEATURES,
        "input_parameters": INPUT_RANGES,
        "supported_crops": metadata["class_names"],
        "training": {
            "trained_at_utc": metadata["trained_at_utc"],
            "train_rows": metadata["train_rows"],
            "test_rows": metadata["test_rows"],
            "dataset": metadata["dataset"],
        },
        "evaluation": {
            name: metadata["metrics"][name]
            for name in (
                "accuracy",
                "precision_weighted",
                "recall_weighted",
                "f1_weighted",
                "confusion_matrix",
                "confusion_matrix_labels",
            )
        },
        "feature_importance": metadata["feature_importance"],
        "score_note": metadata["score_note"],
    }


@app.get("/karnataka/districts")
def get_karnataka_districts() -> dict[str, Any]:
    districts = list_karnataka_districts()
    return {"success": True, "state": "Karnataka", "districts": districts, "count": len(districts)}


@app.get("/karnataka/taluks")
def get_karnataka_taluks(district: str) -> dict[str, Any]:
    taluks = list_karnataka_taluks(district)
    return {"success": True, "district": district, "taluks": taluks, "count": len(taluks)}


@app.get("/karnataka/soil")
def get_karnataka_soil(district: str, taluk: str | None = None) -> dict[str, Any]:
    soil_profile = get_regional_soil_profile(district, taluk)
    return {"success": True, "soil_profile": soil_profile}


@app.get("/karnataka/rainfall")
def get_karnataka_rainfall(district: str, taluk: str | None = None) -> dict[str, Any]:
    rainfall_profile = get_regional_rainfall(district, taluk)
    return {"success": True, "rainfall_profile": rainfall_profile}


@app.post("/recommend")
def recommend(request: CropRecommendationRequest) -> dict[str, Any]:
    bundle = _get_crop_model()
    features = request.model_dump(by_alias=True)
    raw_recommendations = predict_top_three(bundle, features)

    if request.district:
        enhanced = enhance_crop_recommendation(
            ml_recommendations=raw_recommendations,
            district=request.district,
            taluk=request.taluk,
            season=request.season,
            user_inputs=features,
            is_actual_soil_test=request.is_actual_soil_test,
        )
        return {
            "success": True,
            "recommendations": raw_recommendations,
            "enhanced_recommendations": enhanced["top_three_recommendations"],
            "location": enhanced["location"],
            "selected_season": enhanced["selected_season"],
            "regional_soil_profile": enhanced["regional_soil_profile"],
            "regional_rainfall_profile": enhanced["regional_rainfall_profile"],
            "soil_health_deficiencies": enhanced["soil_health_deficiencies"],
            "soil_management_suggestions": enhanced["soil_management_suggestions"],
            "score_note": bundle["metadata"]["score_note"],
        }

    return {
        "success": True,
        "recommendations": raw_recommendations,
        "score_note": bundle["metadata"]["score_note"],
    }


@app.post("/predict-disease")
async def predict_disease(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="A valid image file is required.")

    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported.")

    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise ValueError("Uploaded file is empty.")

        image = _image_to_rgb(image_bytes)

        if is_disease_model_available():
            prediction = predict_disease_mobilenet(image)
            return {
                "success": True,
                "image_name": file.filename,
                "prediction": prediction,
                "model_status": {
                    "available": True,
                    "name": "MobileNetV2 (PlantVillage Pretrained)",
                    "note": "Classified using MobileNetV2 across 38 crop disease & healthy conditions.",
                },
            }
        else:
            prediction = _heuristic_prediction(image)
            return {
                "success": True,
                "image_name": file.filename,
                "prediction": prediction,
                "model_status": {
                    "available": False,
                    "name": MODEL_NAME,
                    "note": "This environment does not currently include a trained plant disease checkpoint. The current inference is a transparent heuristic fallback.",
                },
            }
    except Exception as exc:  # pragma: no cover - defensive path
        raise HTTPException(status_code=400, detail=f"Image processing failed: {exc}") from exc
