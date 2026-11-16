import json
import logging
from pathlib import Path
from typing import Any, Dict, List

import torch
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "disease_model" / "pytorch_model.bin"
CONFIG_PATH = BASE_DIR / "disease_model" / "config.json"

# Agricultural guidance dictionary for the 38 PlantVillage classes
DISEASE_GUIDANCE: Dict[str, Dict[str, Any]] = {
    "Late Blight": {
        "symptoms": [
            "Water-soaked dark lesions on leaf tips or margins.",
            "White fungal growth on leaf undersides during humid conditions.",
            "Rapid browning and wilting of plant tissue."
        ],
        "recommendation": "Isolate affected crops immediately. Apply copper-based or Mancozeb fungicides. Avoid overhead watering to reduce canopy humidity."
    },
    "Early Blight": {
        "symptoms": [
            "Concentric rings ('target spots') on older lower leaves.",
            "Yellow halo surrounding brown necrotic lesions.",
            "Premature defoliation starting from the bottom up."
        ],
        "recommendation": "Prune infected lower foliage. Ensure 3-year crop rotation. Apply chlorothalonil or bio-fungicide (Trichoderma viride)."
    },
    "Black Rot": {
        "symptoms": [
            "Yellow V-shaped lesions along leaf margins.",
            "Darkened leaf veins turning black.",
            "Wilting and progressive leaf drop."
        ],
        "recommendation": "Remove and destroy infected plant debris. Treat with copper hydroxide sprays. Use certified disease-free seeds in future plantings."
    },
    "Powdery Mildew": {
        "symptoms": [
            "White to greyish talcum-like powdery spots on leaf surfaces.",
            "Leaves may curl upward, turn yellow, and dry out.",
            "Reduced photosynthesis and stunted new shoots."
        ],
        "recommendation": "Apply wettable sulfur or neem oil (0.5%) spray during evening hours. Improve plant spacing to enhance airflow."
    },
    "Common Rust": {
        "symptoms": [
            "Reddish-brown to golden pustules scattered on upper and lower leaf surfaces.",
            "Pustules rupture releasing powdery spores when touched."
        ],
        "recommendation": "Plant rust-resistant hybrid varieties. Apply triazole or strobilurin-based foliar fungicides if infection exceeds threshold."
    },
    "Bacterial Spot": {
        "symptoms": [
            "Small water-soaked circular spots with dark brown centers.",
            "Greasy appearance on leaf undersides.",
            "Spots may coalesce into irregular dead patches."
        ],
        "recommendation": "Avoid working in fields when foliage is wet. Spray copper bactericides mixed with Mancozeb for enhanced bacterial control."
    },
    "Leaf Scorch": {
        "symptoms": [
            "Irregular purplish to dark-brown spots with pale centers.",
            "Leaf margins appear burnt and curled."
        ],
        "recommendation": "Maintain adequate soil moisture. Apply preventive broad-spectrum fungicides after harvest or at first sign of runner development."
    },
    "Healthy": {
        "symptoms": [
            "Vibrant uniform coloration with intact cellular margins.",
            "No visible fungal pustules, bacterial lesions, or viral mottling."
        ],
        "recommendation": "Leaf is in healthy condition! Maintain balanced NPK nutrition and continue regular scouting for early pest or disease pressure."
    }
}

_model = None
_id2label = {}

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def load_disease_model():
    global _model, _id2label
    if _model is not None:
        return _model

    if not MODEL_PATH.exists() or not CONFIG_PATH.exists():
        logger.warning("MobileNetV2 disease model files not found on disk.")
        return None

    try:
        # Load label configuration
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            config = json.load(f)
        _id2label = config.get("id2label", {})

        # Build MobileNetV2 architecture (38 classes)
        num_classes = len(_id2label) or 38
        model = models.mobilenet_v2(num_classes=num_classes)
        tv_state = model.state_dict()

        # Load weights and remap 314 layer names from Hugging Face checkpoint
        raw_sd = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
        remapped_sd = {tv_k: raw_sd[hf_k] for hf_k, tv_k in zip(raw_sd.keys(), tv_state.keys())}
        model.load_state_dict(remapped_sd)
        model.eval()

        _model = model
        logger.info("MobileNetV2 Plant Disease model loaded successfully (38 classes).")
        return _model
    except Exception as e:
        logger.exception(f"Failed to load MobileNetV2 disease model: {e}")
        return None


def is_disease_model_available() -> bool:
    return MODEL_PATH.exists() and CONFIG_PATH.exists()


def get_guidance(label: str) -> Dict[str, Any]:
    for key, data in DISEASE_GUIDANCE.items():
        if key.lower() in label.lower():
            return data

    if "healthy" in label.lower():
        return DISEASE_GUIDANCE["Healthy"]

    return {
        "symptoms": ["Leaf shows discoloration or lesions consistent with crop stress."],
        "recommendation": "Isolate affected plants. Consult a local Krishi Vigyan Kendra (KVK) or extension officer for targeted field confirmation."
    }


def predict_disease_mobilenet(image: Image.Image) -> Dict[str, Any]:
    model = load_disease_model()
    if model is None:
        raise RuntimeError("MobileNetV2 disease model is not loaded.")

    rgb_image = image.convert("RGB")
    tensor = _transform(rgb_image).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=-1)[0]
        top3_prob, top3_idx = torch.topk(probs, 3)

    top_predictions = []
    for p, idx in zip(top3_prob, top3_idx):
        idx_str = str(idx.item())
        class_name = _id2label.get(idx_str, f"Class_{idx_str}")
        score = float(p.item())
        top_predictions.append({
            "class": class_name,
            "score": round(score, 4),
            "score_percent": round(score * 100, 2)
        })

    primary = top_predictions[0]
    primary_label = primary["class"]
    is_healthy = "healthy" in primary_label.lower()

    # Extract crop name if in format "Crop with Disease" or "Healthy Crop Plant"
    parts = primary_label.split(" with ")
    if len(parts) > 1:
        crop_name = parts[0].strip()
    elif "healthy" in primary_label.lower():
        crop_name = primary_label.replace("Healthy", "").replace("Plant", "").strip()
    else:
        crop_name = primary_label.split()[0]

    guidance = get_guidance(primary_label)

    return {
        "prediction": primary_label,
        "crop": crop_name,
        "is_healthy": is_healthy,
        "confidence": primary["score"],
        "confidence_percent": primary["score_percent"],
        "top_predictions": top_predictions,
        "symptoms": guidance["symptoms"],
        "recommendation": guidance["recommendation"],
        "model_architecture": "MobileNetV2 (PlantVillage Pretrained)",
        "classes_count": len(_id2label),
        "source": "mobilenet_v2_deep_learning"
    }
