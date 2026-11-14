
import Farm from "../models/Farm.js";
import { getFarmByOwner, isFallbackMode, upsertFarm } from "../config/fallbackStore.js";

export const saveFarm = async (req, res) => {
  try {
    const {
      farmName,
      location,
      state,
      area,
      areaUnit,
      soilType,
      ph,
      nitrogen,
      phosphorus,
      potassium,
      waterSource
    } = req.body;

    if (!farmName || !location || area === undefined || area === null || area === "") {
      return res.status(400).json({
        success: false,
        message: "Farm name, location and area are required"
      });
    }

    const payload = {
      farmName: String(farmName).trim(),
      location: String(location).trim(),
      state: String(state || "Karnataka").trim(),
      area: Number(area),
      areaUnit: areaUnit || "acres",
      soilType: soilType || "Other",
      ph: ph === "" || ph == null ? null : Number(ph),
      nitrogen: nitrogen === "" || nitrogen == null ? null : Number(nitrogen),
      phosphorus: phosphorus === "" || phosphorus == null ? null : Number(phosphorus),
      potassium: potassium === "" || potassium == null ? null : Number(potassium),
      waterSource: waterSource || "Unknown"
    };

    let farm;

    if (isFallbackMode()) {
      farm = upsertFarm(req.user._id, payload);
    } else {
      farm = await Farm.findOneAndUpdate(
        { owner: req.user._id },
        payload,
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Farm profile saved successfully",
      farm
    });
  } catch (error) {
    console.error("Farm save error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not save farm profile"
    });
  }
};

export const getMyFarm = async (req, res) => {
  try {
    const farm = isFallbackMode()
      ? getFarmByOwner(req.user._id)
      : await Farm.findOne({ owner: req.user._id });

    return res.json({
      success: true,
      farm
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve farm information"
    });
  }
};
