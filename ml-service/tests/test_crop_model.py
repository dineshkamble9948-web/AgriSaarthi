import contextlib
import io
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from main import CropRecommendationRequest, model_info, recommend
from model_utils import FEATURES, load_model_bundle, predict_top_three
from train_model import DATASET_PATH, load_dataset, train_and_evaluate


class CropModelTests(unittest.TestCase):
    def test_dataset_has_expected_features_and_labels(self):
        features, labels, summary = load_dataset(DATASET_PATH)

        self.assertEqual(list(features.columns), FEATURES)
        self.assertEqual(summary["usable_rows"], 2200)
        self.assertEqual(summary["crop_count"], 22)
        self.assertEqual(summary["duplicate_rows_removed"], 0)
        self.assertEqual(summary["missing_feature_values_imputed"], 0)
        self.assertEqual(labels.nunique(), 22)

    def test_trained_model_returns_three_ranked_predictions_and_api_metadata(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            model_path = Path(temp_dir) / "crop_model.pkl"
            metadata_path = Path(temp_dir) / "model_metadata.json"
            with contextlib.redirect_stdout(io.StringIO()):
                metadata = train_and_evaluate(
                    dataset_path=DATASET_PATH,
                    model_path=model_path,
                    metadata_path=metadata_path,
                    n_estimators=20,
                )

            bundle = load_model_bundle(model_path)
            sample = {
                "N": 90,
                "P": 42,
                "K": 43,
                "temperature": 20.87974371,
                "humidity": 82.00274423,
                "ph": 6.502985292,
                "rainfall": 202.9355362,
            }
            predictions = predict_top_three(bundle, sample)

            self.assertEqual(len(predictions), 3)
            self.assertEqual(len({item["crop"] for item in predictions}), 3)
            self.assertTrue(
                all(0 <= item["score"] <= 1 for item in predictions)
            )
            self.assertGreaterEqual(
                predictions[0]["score"],
                predictions[1]["score"],
            )
            self.assertIn("accuracy", metadata["metrics"])
            self.assertEqual(len(metadata["metrics"]["confusion_matrix"]), 22)

            import main

            previous_bundle = main._crop_model_bundle
            try:
                main._crop_model_bundle = bundle
                api_result = recommend(CropRecommendationRequest(**sample))
                info_result = model_info()
            finally:
                main._crop_model_bundle = previous_bundle

            self.assertTrue(api_result["success"])
            self.assertEqual(len(api_result["recommendations"]), 3)
            self.assertEqual(info_result["supported_crops"], metadata["class_names"])

    def test_invalid_api_values_are_rejected(self):
        with self.assertRaises(ValueError):
            CropRecommendationRequest(
                N=-1,
                P=42,
                K=43,
                temperature=20,
                humidity=80,
                ph=6.5,
                rainfall=200,
            )

    def test_dataset_cleaning_removes_duplicates_drops_missing_labels_and_keeps_imputable_features(self):
        rows = [
            {"N": 90, "P": 42, "K": 43, "temperature": 21, "humidity": 82, "ph": 6.5, "rainfall": 203, "label": "rice"},
            {"N": 90, "P": 42, "K": 43, "temperature": 21, "humidity": 82, "ph": 6.5, "rainfall": 203, "label": "rice"},
            {"N": None, "P": 40, "K": 40, "temperature": 20, "humidity": 70, "ph": 6, "rainfall": 180, "label": "rice"},
            {"N": 20, "P": 50, "K": 10, "temperature": 18, "humidity": 60, "ph": 7, "rainfall": 80, "label": "maize"},
            {"N": 30, "P": 55, "K": 15, "temperature": 19, "humidity": 65, "ph": 6.8, "rainfall": 90, "label": "maize"},
            {"N": 45, "P": 35, "K": 20, "temperature": 16, "humidity": 55, "ph": 6.7, "rainfall": 70, "label": "wheat"},
            {"N": 50, "P": 38, "K": 22, "temperature": 17, "humidity": 58, "ph": 6.9, "rainfall": 75, "label": "wheat"},
            {"N": 25, "P": 52, "K": 12, "temperature": 18, "humidity": 62, "ph": 6.9, "rainfall": 85, "label": None},
        ]

        with tempfile.TemporaryDirectory() as temp_dir:
            dataset_path = Path(temp_dir) / "small.csv"
            pd.DataFrame(rows).to_csv(dataset_path, index=False)
            features, labels, summary = load_dataset(dataset_path)

        self.assertEqual(len(features), 6)
        self.assertEqual(len(labels), 6)
        self.assertEqual(summary["duplicate_rows_removed"], 1)
        self.assertEqual(summary["rows_without_target_removed"], 1)
        self.assertEqual(summary["missing_feature_values_imputed"], 1)

    def test_model_bundle_rejects_wrong_feature_order(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            model_path = Path(temp_dir) / "invalid.pkl"
            import joblib

            joblib.dump(
                {"pipeline": None, "feature_names": list(reversed(FEATURES)), "metadata": {}},
                model_path,
            )
            with self.assertRaises(ValueError):
                load_model_bundle(model_path)


if __name__ == "__main__":
    unittest.main()
