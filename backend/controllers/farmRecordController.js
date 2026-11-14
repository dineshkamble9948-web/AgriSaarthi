
const FarmRecord = require("../models/FarmRecord");
const Farm = require("../models/Farm");

exports.createRecord = async (req, res) => {
  try {
    const farm = await Farm.findOne({ owner: req.user.id });

    if (!farm) {
      return res.status(404).json({ message: "Farm profile not found" });
    }

    const record = await FarmRecord.create({
      ...req.body,
      farmer: req.user.id,
      farm: farm._id,
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRecords = async (req, res) => {
  try {
    const records = await FarmRecord.find({
      farmer: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const record = await FarmRecord.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const record = await FarmRecord.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user.id,
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
