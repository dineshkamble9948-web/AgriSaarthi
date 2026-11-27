import { getSchemes, getSchemeById } from "../services/governmentSchemesService.js";
import Farm from "../models/Farm.js";
import { findFarmByIdAndOwner, isFallbackMode } from "../config/fallbackStore.js";

export const listSchemes = async (req, res) => {
  try {
    const { category, state, crop, landArea, farmId } = req.query;

    let targetState = state || "Karnataka";
    let targetCrop = crop || "";
    let targetArea = landArea ? Number(landArea) : null;

    if (farmId && req.user?._id) {
      const farm = isFallbackMode()
        ? findFarmByIdAndOwner(farmId, req.user._id)
        : await Farm.findOne({ _id: farmId, owner: req.user._id });
      if (farm) {
        targetState = farm.state || targetState;
        targetArea = targetArea || farm.area;
      }
    } else if (req.user) {
      targetState = req.user.state || targetState;
      targetArea = targetArea || req.user.totalLandArea;
    }

    const schemes = getSchemes({
      category,
      state: targetState,
      crop: targetCrop,
      landArea: targetArea
    });

    return res.status(200).json({
      success: true,
      count: schemes.length,
      total: schemes.length,
      schemes,
      data: schemes,
      disclaimer: "Official scheme guidelines and disbursement timelines are administered by respective state and central departments. Farmers must verify eligibility through their local Raitha Samparka Kendra (RSK) or Common Service Center (CSC).",
      provenance: "Official Government of India (myScheme) & Government of Karnataka (agri.karnataka.gov.in) agricultural portals."
    });
  } catch (error) {
    console.error("Schemes lookup error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve government schemes."
    });
  }
};

export const getSchemeDetails = (req, res) => {
  const { id } = req.params;
  const scheme = getSchemeById(id);
  if (!scheme) {
    return res.status(404).json({ success: false, message: "Scheme not found." });
  }
  return res.status(200).json({ success: true, scheme, data: scheme });
};
