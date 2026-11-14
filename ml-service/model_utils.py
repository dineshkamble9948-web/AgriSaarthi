from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"
MODEL_PATH = Path(
    os.getenv("CROP_MODEL_PATH", str(Path(__file__).resolve().parent / "crop_model.pkl"))
)


def load_model_bundle(model_path: Path = MODEL_PATH) -> dict[str, Any]:
    if not model_path.is_file():
        raise FileNotFoundError(
            f"Trained crop model was not found at {model_path}. Run train_model.py first."
        )

    bundle = joblib.load(model_path)
    if not isinstance(bundle, dict) or not {"pipeline", "feature_names", "metadata"} <= bundle.keys():
        raise ValueError("Crop model file has an invalid format. Retrain the model.")
    if bundle["feature_names"] != FEATURES:
        raise ValueError("Crop model feature order does not match the API. Retrain the model.")

    return bundle


def predict_top_three(bundle: dict[str, Any], values: dict[str, float]) -> list[dict[str, Any]]:
    features = pd.DataFrame(
        [[values[name] for name in FEATURES]],
        columns=FEATURES,
    )
    pipeline = bundle["pipeline"]
    scores = pipeline.predict_proba(features)[0]
    classifier = pipeline.named_steps["classifier"]
    top_indexes = scores.argsort()[::-1][:3]

    return [
        {
            "crop": str(classifier.classes_[index]),
            "score": round(float(scores[index]), 6),
            "score_percent": round(float(scores[index]) * 100, 2),
        }
        for index in top_indexes
    ]
