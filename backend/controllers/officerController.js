import { getOfficers } from "../services/agriculturalOfficersService.js";
import Farm from "../models/Farm.js";
import { findFarmByIdAndOwner, isFallbackMode } from "../config/fallbackStore.js";

export const listOfficers = async (req, res) => {
  try {
    const { district, taluk, category, farmId } = req.query;

    let targetDistrict = district || "";
    let targetTaluk = taluk || "";

    if (!targetDistrict && farmId && req.user?._id) {
      const farm = isFallbackMode()
        ? findFarmByIdAndOwner(farmId, req.user._id)
        : await Farm.findOne({ _id: farmId, owner: req.user._id });
      if (farm) {
        targetDistrict = farm.district || targetDistrict;
        targetTaluk = farm.taluk || farm.village || targetTaluk;
      }
    } else if (!targetDistrict && req.user) {
      targetDistrict = req.user.district || "Raichur";
      targetTaluk = req.user.taluk || req.user.village || "";
    }

    const officers = getOfficers({
      district: targetDistrict,
      taluk: targetTaluk,
      category
    });

    return res.status(200).json({
      success: true,
      count: officers.length,
      total: officers.length,
      filter: { district: targetDistrict, taluk: targetTaluk, category },
      officers,
      data: officers,
      disclaimer: "Contacts represent verified public agricultural extension offices. Officer postings may vary periodically. For 24/7 nationwide telephone assistance in Kannada or English, contact the Kisan Call Center at 1800-180-1551.",
      provenance: "Department of Agriculture, Government of Karnataka (agri.karnataka.gov.in) & ICAR-ATARI KVK Directory."
    });
  } catch (error) {
    console.error("Officers directory lookup error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve agricultural officers directory."
    });
  }
};
