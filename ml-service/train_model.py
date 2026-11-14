from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from model_utils import FEATURES, MODEL_PATH, TARGET


SERVICE_DIR = Path(__file__).resolve().parent
DATASET_PATH = Path(
    os.getenv(
        "CROP_DATASET_PATH",
        str(SERVICE_DIR / "dataset" / "Crop_recommendation.csv"),
    )
)
METADATA_PATH = SERVICE_DIR / "model_metadata.json"
RANDOM_STATE = 42
TEST_SIZE = 0.2


def load_dataset(dataset_path: Path) -> tuple[pd.DataFrame, pd.Series, dict[str, Any]]:
    if not dataset_path.is_file():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    raw = pd.read_csv(dataset_path)
    required_columns = FEATURES + [TARGET]
    missing_columns = [column for column in required_columns if column not in raw.columns]
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing_columns)}")

    data = raw[required_columns].copy()
    original_rows = len(data)

    for column in FEATURES:
        data[column] = pd.to_numeric(data[column], errors="coerce")

    data[TARGET] = data[TARGET].astype("string").str.strip()
    missing_target = data[TARGET].isna() | data[TARGET].eq("")
    missing_target_rows = int(missing_target.sum())
    data = data.loc[~missing_target].copy()

    duplicate_rows = int(data.duplicated().sum())
    data = data.drop_duplicates().reset_index(drop=True)

    if data.empty:
        raise ValueError("Dataset contains no usable records after cleaning.")

    all_missing_features = [column for column in FEATURES if data[column].isna().all()]
    if all_missing_features:
        raise ValueError(
            "Cannot impute features that contain no numeric values: "
            + ", ".join(all_missing_features)
        )

    missing_feature_values = int(data[FEATURES].isna().sum().sum())
    labels = data[TARGET].astype(str)
    class_counts = labels.value_counts()
    if len(class_counts) < 3:
        raise ValueError("Dataset must contain at least three crop labels for top-three predictions.")
    too_small_classes = class_counts[class_counts < 2].index.tolist()
    if too_small_classes:
        raise ValueError(
            "Stratified splitting requires at least two rows per crop label: "
            + ", ".join(too_small_classes)
        )

    dataset_summary = {
        "source_file": dataset_path.name,
        "original_rows": original_rows,
        "usable_rows": len(data),
        "duplicate_rows_removed": duplicate_rows,
        "rows_without_target_removed": missing_target_rows,
        "missing_feature_values_imputed": missing_feature_values,
        "crop_count": int(labels.nunique()),
        "class_counts": {str(label): int(count) for label, count in class_counts.items()},
    }

    return data[FEATURES], labels, dataset_summary


def build_pipeline(n_estimators: int = 300) -> Pipeline:
    if n_estimators < 1:
        raise ValueError("n_estimators must be at least 1.")

    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=n_estimators,
                    random_state=RANDOM_STATE,
                    class_weight="balanced_subsample",
                    n_jobs=-1,
                ),
            ),
        ]
    )


def train_and_evaluate(
    dataset_path: Path = DATASET_PATH,
    model_path: Path = MODEL_PATH,
    metadata_path: Path = METADATA_PATH,
    n_estimators: int = 300,
) -> dict[str, Any]:
    features, labels, dataset_summary = load_dataset(dataset_path)
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=labels,
    )

    pipeline = build_pipeline(n_estimators)
    pipeline.fit(x_train, y_train)
    predictions = pipeline.predict(x_test)
    classes = [str(label) for label in pipeline.named_steps["classifier"].classes_]

    classifier = pipeline.named_steps["classifier"]
    feature_importance = {
        name: round(float(importance), 8)
        for name, importance in sorted(
            zip(FEATURES, classifier.feature_importances_),
            key=lambda item: item[1],
            reverse=True,
        )
    }
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision_weighted": float(
            precision_score(y_test, predictions, average="weighted", zero_division=0)
        ),
        "recall_weighted": float(
            recall_score(y_test, predictions, average="weighted", zero_division=0)
        ),
        "f1_weighted": float(
            f1_score(y_test, predictions, average="weighted", zero_division=0)
        ),
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=classes).tolist(),
        "confusion_matrix_labels": classes,
    }
    metadata = {
        "model_type": "RandomForestClassifier",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "feature_names": FEATURES,
        "target_name": TARGET,
        "class_names": classes,
        "random_state": RANDOM_STATE,
        "test_size": TEST_SIZE,
        "n_estimators": n_estimators,
        "train_rows": len(x_train),
        "test_rows": len(x_test),
        "dataset": dataset_summary,
        "metrics": metrics,
        "feature_importance": feature_importance,
        "score_note": (
            "Random Forest class scores describe model outputs for this dataset; "
            "they are not probabilities of farming success."
        ),
        "scikit_learn_version": sklearn.__version__,
    }

    bundle = {
        "pipeline": pipeline,
        "feature_names": FEATURES,
        "metadata": metadata,
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, model_path)
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"Dataset rows: {dataset_summary['usable_rows']} usable / {dataset_summary['original_rows']} original")
    print(f"Duplicates removed: {dataset_summary['duplicate_rows_removed']}")
    print(f"Missing feature values imputed: {dataset_summary['missing_feature_values_imputed']}")
    print(f"Training rows: {len(x_train)}; test rows: {len(x_test)}")
    print("Evaluation metrics:")
    for name in ("accuracy", "precision_weighted", "recall_weighted", "f1_weighted"):
        print(f"  {name}: {metrics[name]:.4f}")
    print(f"Confusion matrix labels: {', '.join(classes)}")
    print("Confusion matrix:")
    for row in metrics["confusion_matrix"]:
        print("  " + " ".join(str(value) for value in row))
    print("Feature importance:")
    for name, importance in feature_importance.items():
        print(f"  {name}: {importance:.4f}")
    print(f"Model saved to: {model_path}")
    print(f"Metadata saved to: {metadata_path}")

    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the AgriSaarthi Random Forest crop model.")
    parser.add_argument("--data", type=Path, default=DATASET_PATH, help="Path to Crop_recommendation.csv")
    parser.add_argument("--model", type=Path, default=MODEL_PATH, help="Output path for crop_model.pkl")
    parser.add_argument("--metadata", type=Path, default=METADATA_PATH, help="Output path for model_metadata.json")
    parser.add_argument("--estimators", type=int, default=300, help="Number of Random Forest trees")
    args = parser.parse_args()

    train_and_evaluate(args.data, args.model, args.metadata, args.estimators)


if __name__ == "__main__":
    main()
