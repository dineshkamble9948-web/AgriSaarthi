import { generateCropCalendar } from "../services/farmingCalendarService.js";
import FarmPlot from "../models/FarmPlot.js";
import CropCycle from "../models/CropCycle.js";
import { findFarmPlotById, isFallbackMode, listCropCyclesByFarm } from "../config/fallbackStore.js";

// In-memory completed tasks storage for demo/fallback mode
const completedTaskSet = new Set();

export const getFarmingCalendar = async (req, res) => {
  try {
    const { crop, sowingDate, plotId } = req.query;

    let targetCrop = crop;
    let targetSowing = sowingDate;

    if (plotId) {
      const plot = isFallbackMode()
        ? findFarmPlotById(plotId, req.user._id)
        : await FarmPlot.findOne({ _id: plotId, owner: req.user._id });
      if (plot) {
        targetCrop = targetCrop || plot.currentCrop;
      }
    }

    if (!targetCrop) {
      targetCrop = "Cotton";
    }

    const tasks = generateCropCalendar(targetCrop, targetSowing).map(task => ({
      ...task,
      isCompleted: completedTaskSet.has(`${req.user._id}_${task.taskId}`)
    }));

    return res.status(200).json({
      success: true,
      crop: targetCrop,
      sowingDate: targetSowing || new Date().toISOString().split("T")[0],
      totalTasks: tasks.length,
      completedCount: tasks.filter(t => t.isCompleted).length,
      tasks,
      data: {
        crop: targetCrop,
        tasks
      }
    });
  } catch (error) {
    console.error("Farming calendar error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not generate farming calendar."
    });
  }
};

export const toggleCalendarTask = (req, res) => {
  try {
    const { taskId, isCompleted, completed } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, message: "taskId is required." });
    }

    const mark = typeof completed === "boolean" ? completed : Boolean(isCompleted);
    const key = `${req.user._id}_${taskId}`;
    if (mark) {
      completedTaskSet.add(key);
    } else {
      completedTaskSet.delete(key);
    }

    return res.status(200).json({
      success: true,
      taskId,
      completed: mark,
      isCompleted: mark,
      message: mark ? "Task marked as completed." : "Task marked as pending."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update task status." });
  }
};
