import unittest

from crop_recommendation import recommend_crops


class CropRecommendationTests(unittest.TestCase):
    def setUp(self):
        self.inputs = {
            "soil_type": "Loamy",
            "ph": 6.5,
            "season": "Rabi",
            "irrigation": "Available",
            "rainfall_mm": 600,
            "temperature_c": 18,
            "nitrogen": 55,
            "phosphorus": 35,
            "potassium": 42,
        }

    def test_returns_five_ranked_screening_recommendations(self):
        result = recommend_crops(self.inputs)
        recommendations = result["recommendations"]

        self.assertEqual(len(recommendations), 5)
        self.assertEqual(
            [item["suitability_score"] for item in recommendations],
            sorted(
                [item["suitability_score"] for item in recommendations],
                reverse=True,
            ),
        )
        self.assertFalse(result["is_trained_ml"])
        self.assertTrue(all(0 <= item["suitability_score"] <= 100 for item in recommendations))

    def test_weather_inputs_affect_ranking_and_missing_weather_is_supported(self):
        cold_dry = recommend_crops(self.inputs)
        hot_wet_inputs = {
            **self.inputs,
            "rainfall_mm": 1800,
            "temperature_c": 32,
        }
        hot_wet = recommend_crops(hot_wet_inputs)
        no_weather_inputs = {
            key: value
            for key, value in self.inputs.items()
            if key not in {"rainfall_mm", "temperature_c"}
        }
        no_weather = recommend_crops(no_weather_inputs)

        cold_maize_score = next(
            item["suitability_score"]
            for item in cold_dry["recommendations"]
            if item["crop"] == "Maize"
        )
        hot_maize_score = next(
            item["suitability_score"]
            for item in hot_wet["recommendations"]
            if item["crop"] == "Maize"
        )
        self.assertNotEqual(cold_maize_score, hot_maize_score)
        self.assertNotIn("rainfall", no_weather["recommendations"][0]["matched_inputs"])
        self.assertNotIn("temperature", no_weather["recommendations"][0]["matched_inputs"])

    def test_npk_values_are_reported_as_unranked_without_calibrated_context(self):
        result = recommend_crops(self.inputs)

        self.assertTrue(any("NPK values were provided but are not used" in note for note in result["data_notes"]))


if __name__ == "__main__":
    unittest.main()
