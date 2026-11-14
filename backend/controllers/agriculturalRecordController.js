
import Farm from "../models/Farm.js";
import AgriculturalRecord from "../models/AgriculturalRecord.js";
import {
  createRecordEntry,
  deleteRecordEntry,
  getFarmByOwner,
  isFallbackMode,
  listRecordsByOwner,
  updateRecordEntry
} from "../config/fallbackStore.js";

const getUserFarm = async (userId) => {
  if (isFallbackMode()) {
    return getFarmByOwner(userId);
  }
  return Farm.findOne({ owner: userId });
};

export const createRecord = async (req, res) => {
  try {
    const { activityType, cropName, date, quantity, unit, cost, notes } = req.body;

    if (!activityType || !cropName || !date) {
      return res.status(400).json({
        success: false,
        message: "Activity type, crop name and date are required."
      });
    }

    const farm = await getUserFarm(req.user._id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Please create your farm profile first."
      });
    }

    const payload = {
      owner: req.user._id,
      farm: farm._id || farm.id,
      activityType: String(activityType),
      cropName: String(cropName).trim(),
      date: new Date(date).toISOString(),
      quantity: quantity === undefined || quantity === null || quantity === "" ? 0 : Number(quantity),
      unit: unit || "",
      cost: cost === undefined || cost === null || cost === "" ? 0 : Number(cost),
      notes: notes || ""
    };

    let record;

    if (isFallbackMode()) {
      record = createRecordEntry(payload);
    } else {
      record = await AgriculturalRecord.create(payload);
    }

    return res.status(201).json({
      success: true,
      message: "Agricultural record created successfully.",
      record
    });
  } catch (error) {
    console.error("Create agricultural record error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not create agricultural record."
    });
  }
};

export const getRecords = async (req, res) => {
  try {
    const { activityType, cropName } = req.query;

    let records = [];

    if (isFallbackMode()) {
      records = listRecordsByOwner(req.user._id);
    } else {
      const filter = { owner: req.user._id };

      if (activityType) {
        filter.activityType = activityType;
      }

      if (cropName) {
        filter.cropName = { $regex: cropName, $options: "i" };
      }

      records = await AgriculturalRecord.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    }

    if (activityType) {
      records = records.filter((record) => record.activityType === activityType);
    }

    if (cropName) {
      records = records.filter((record) =>
        String(record.cropName || "").toLowerCase().includes(String(cropName).toLowerCase())
      );
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    console.error("Get agricultural records error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not fetch agricultural records."
    });
  }
};

export const updateRecord = async (req, res) => {
  try {
    const { activityType, cropName, date, quantity, unit, cost, notes } = req.body;

    if (!activityType || !cropName || !date) {
      return res.status(400).json({
        success: false,
        message: "Activity type, crop name and date are required."
      });
    }

    const payload = {
      activityType: String(activityType),
      cropName: String(cropName).trim(),
      date: new Date(date).toISOString(),
      quantity: quantity === undefined || quantity === null || quantity === "" ? 0 : Number(quantity),
      unit: unit || "",
      cost: cost === undefined || cost === null || cost === "" ? 0 : Number(cost),
      notes: notes || ""
    };

    let record;

    if (isFallbackMode()) {
      record = updateRecordEntry(req.params.id, req.user._id, payload);
    } else {
      record = await AgriculturalRecord.findOneAndUpdate(
        { _id: req.params.id, owner: req.user._id },
        payload,
        { new: true }
      );
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Agricultural record updated successfully.",
      record
    });
  } catch (error) {
    console.error("Update agricultural record error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid record ID."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not update agricultural record."
    });
  }
};

export const deleteRecord = async (req, res) => {
  try {
    let record;

    if (isFallbackMode()) {
      record = deleteRecordEntry(req.params.id, req.user._id);
    } else {
      record = await AgriculturalRecord.findOneAndDelete({
        _id: req.params.id,
        owner: req.user._id
      });
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Agricultural record deleted successfully."
    });
  } catch (error) {
    console.error("Delete agricultural record error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid record ID."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not delete agricultural record."
    });
  }
};
