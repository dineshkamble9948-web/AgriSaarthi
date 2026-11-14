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
        "disease_model_loaded": MODEL_AVAILABLE,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "success": True,
        "service": "ML Service",
        "message": "Python ML service is working",
        "crop_model_loaded": CROP_MODEL_PATH.is_file(),
        "disease_model_loaded": MODEL_AVAILABLE,
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


@app.post("/recommend")
def recommend(request: CropRecommendationRequest) -> dict[str, Any]:
    bundle = _get_crop_model()
    features = request.model_dump(by_alias=True)
    recommendations = predict_top_three(bundle, features)

    return {
        "success": True,
        "recommendations": recommendations,
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
        prediction = _heuristic_prediction(image)

        return {
            "success": True,
            "image_name": file.filename,
            "prediction": prediction,
            "model_status": {
                "available": MODEL_AVAILABLE,
                "name": MODEL_NAME,
                "note": "This environment does not currently include a trained plant disease checkpoint. The current inference is a transparent heuristic fallback and should be treated as low-confidence guidance only.",
            },
        }
    except Exception as exc:  # pragma: no cover - defensive path
        raise HTTPException(status_code=400, detail=f"Image processing failed: {exc}") from exc
