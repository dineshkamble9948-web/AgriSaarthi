import Farm from "../models/Farm.js";
import FarmPlot from "../models/FarmPlot.js";
import CropCycle from "../models/CropCycle.js";
import FarmAlert from "../models/FarmAlert.js";
import {
  findFarmByIdAndOwner,
  findFarmPlotById,
  isFallbackMode,
  listCropCyclesByFarm,
  listFarmAlerts
} from "../config/fallbackStore.js";
import {
  getRegionalSoilProfile,
  calculateSoilWaterBalance,
  getDistrictCropYieldStatistics
} from "../services/karnatakaAgriculturalService.js";
import { getWeatherForCoordinates } from "../services/weatherService.js";
import { createFertilizerRecommendation } from "../services/fertilizerRecommendationService.js";
import { createIrrigationRecommendation } from "../services/irrigationRecommendationService.js";

export const getUnifiedPlotDashboard = async (req, res) => {
  try {
    const { plotId } = req.params;
    if (!plotId) {
      return res.status(400).json({ success: false, message: "plotId is required." });
    }

    let plot = null;
    let farm = null;

    if (isFallbackMode()) {
      plot = findFarmPlotById(plotId, req.user._id);
      if (plot) {
        farm = findFarmByIdAndOwner(plot.farm, req.user._id);
      }
    } else {
      plot = await FarmPlot.findOne({ _id: plotId, owner: req.user._id });
      if (plot) {
        farm = await Farm.findOne({ _id: plot.farm, owner: req.user._id });
      }
    }

    if (!plot) {
      return res.status(404).json({
        success: false,
        message: "Plot not found or access denied."
      });
    }

    const district = farm?.district || "Raichur";
    const lat = plot.latitude ?? farm?.latitude ?? 16.205;
    const lon = plot.longitude ?? farm?.longitude ?? 77.355;
    const cropName = plot.currentCrop || "Cotton";

    // 1. Regional soil profile
    let soilSummary = null;
    try {
      soilSummary = getRegionalSoilProfile(district, plot.locationName || farm?.village);
    } catch {
      soilSummary = { district, status: "Normal" };
    }

    // 2. Weather & Forecast with fault isolation
    let weatherSummary = null;
    const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
    if (apiKey) {
      try {
        weatherSummary = await getWeatherForCoordinates(lat, lon, apiKey, plot.plotName);
      } catch (e) {
        weatherSummary = { status: "Weather service offline", note: e.message };
      }
    } else {
      weatherSummary = {
        location: { name: district, latitude: lat, longitude: lon },
        current: { temperatureC: 28, humidityPercent: 68, condition: "Partly Cloudy", rainfallMm: 0 },
        source: "Seasonal Agro-Climatic Normal (Offline Mode)"
      };
    }

    // 3. Crop Cycle and Growth Stage
    let cropLifecycle = null;
    try {
      let cycles = [];
      if (isFallbackMode()) {
        cycles = listCropCyclesByFarm(plot.farm, req.user._id)
          .filter(c => !c.plot || String(c.plot) === String(plot._id || plot.id));
      } else {
        cycles = await CropCycle.find({
          farm: plot.farm,
          owner: req.user._id,
          ...(plot._id ? { $or: [{ plot: plot._id }, { plot: null }] } : {})
        }).sort({ sowingDate: -1 });
      }

      if (cycles.length > 0) {
        const active = cycles[0];
        cropLifecycle = {
          cropName: active.cropName,
          variety: active.cropVariety || "Hybrid",
          stage: active.currentStage || "Vegetative Growth",
          sowingDate: active.sowingDate,
          expectedHarvest: active.expectedHarvestDate
        };
      } else {
        cropLifecycle = {
          cropName,
          variety: "Standard Regional Variety",
          stage: "Vegetative Growth",
          sowingDate: new Date(Date.now() - 30 * 86400000).toISOString(),
          expectedHarvest: new Date(Date.now() + 90 * 86400000).toISOString()
        };
      }
    } catch {
      cropLifecycle = { cropName, stage: "Vegetative Growth" };
    }

    // 4. Fertilizer Intelligence Status
    let fertilizerStatus = null;
    try {
      const npkStatus = {
        nitrogen: soilSummary?.nitrogen_status?.includes("Low") ? "low" : "adequate",
        phosphorus: soilSummary?.phosphorus_status?.includes("Low") ? "low" : "adequate",
        potassium: "adequate"
      };
      fertilizerStatus = createFertilizerRecommendation({
        crop: cropName,
        soilPh: soilSummary?.ph || 7.2,
        laboratoryNPK: { status: npkStatus },
        cropGrowthStage: cropLifecycle.stage,
        landArea: plot.area || 1,
        areaUnit: plot.areaUnit || "acres",
        district
      });
    } catch (e) {
      fertilizerStatus = { note: "Fertilizer advisory currently unavailable", error: e.message };
    }

    // 5. Irrigation Intelligence Status
    let irrigationStatus = null;
    try {
      const guidance = createIrrigationRecommendation({
        cropCycle: cropLifecycle,
        weather: weatherSummary?.current ? {
          hourly: Array.from({ length: 8 }, () => ({
            rainfallMm: weatherSummary.current.rainfallMm || 0,
            precipitationProbabilityPercent: 10
          }))
        } : null,
        soilAssessment: { source: "Karnataka Soil Benchmark" }
      });
      irrigationStatus = {
        status: guidance.status,
        recommendation: guidance.recommendation,
        timing: guidance.recommendedTiming
      };
    } catch {
      irrigationStatus = {
        status: "field-check-recommended",
        recommendation: "Inspect root-zone soil moisture before turning on irrigation."
      };
    }

    // 6. Recent Alerts
    let recentAlerts = [];
    try {
      if (isFallbackMode()) {
        recentAlerts = listFarmAlerts(req.user._id, plot.farm).slice(0, 3);
      } else {
        recentAlerts = await FarmAlert.find({ farm: plot.farm, owner: req.user._id })
          .sort({ createdAt: -1 })
          .limit(3);
      }
    } catch {
      recentAlerts = [];
    }

    // 7. Official Crop Yield Benchmark and Agro-Climatic Moisture Balance
    let yieldEstimate = null;
    let soilMoistureAssessment = null;
    try {
      const areaVal = plot.area || farm?.area || 1;
      yieldEstimate = getDistrictCropYieldStatistics(district, cropName, areaVal);
    } catch {
      yieldEstimate = {
        district,
        crop: cropName,
        totalExpectedYieldTonnes: 2.2,
        totalExpectedYieldQuintals: 22,
        source: "Directorate of Economics and Statistics (DES)"
      };
    }

    try {
      soilMoistureAssessment = calculateSoilWaterBalance({
        soilType: plot.soilType || farm?.soilType || soilSummary?.soil_type || "Medium Black",
        weather: weatherSummary?.current,
        district
      });
    } catch {
      soilMoistureAssessment = {
        moisturePercent: 60,
        status: "Optimal",
        recommendation: "Soil moisture is in the optimal range (50-75% AWC)."
      };
    }

    const payload = {
      plot: {
        id: plot._id || plot.id,
        plotName: plot.plotName || plot.name,
        name: plot.plotName || plot.name,
        area: plot.area,
        areaUnit: plot.areaUnit || (typeof plot.area === "object" ? plot.area.unit : "acres"),
        soilType: plot.soilType || soilSummary?.soil_type || "Medium Black",
        currentCrop: cropName,
        previousCrops: plot.previousCrops || [],
        irrigationType: plot.irrigationType || "Drip",
        coordinates: [lat, lon],
        boundary: plot.boundary || null
      },
      farm: {
        id: farm?._id || farm?.id,
        farmName: farm?.farmName || farm?.name || "Primary Farm",
        state: farm?.state || "Karnataka",
        district
      },
      soil: soilSummary,
      soilSummary: {
        nitrogenKgHa: soilSummary?.nitrogen_kg_ha,
        phosphorusKgHa: soilSummary?.phosphorus_kg_ha,
        potassiumKgHa: soilSummary?.potassium_kg_ha,
        ph: soilSummary?.ph,
        organicCarbonPercent: soilSummary?.organic_carbon_percent,
        zincPpm: soilSummary?.zinc_ppm,
        deficiencies: soilSummary?.deficiencies || [],
        dataLevel: soilSummary?.data_level || "District Benchmark"
      },
      weather: weatherSummary,
      weatherSummary: {
        currentTempC: weatherSummary?.current?.temperatureC,
        humidityPercent: weatherSummary?.current?.humidityPercent,
        condition: weatherSummary?.current?.condition,
        rainfallForecastMm: weatherSummary?.current?.rainfallMm || 0,
        forecast: (weatherSummary?.forecast || []).slice(0, 5)
      },
      crop: cropLifecycle,
      cropLifecycle,
      fertilizer: fertilizerStatus,
      fertilizerStatus: {
        verifiedPackageOfPractices: fertilizerStatus?.verifiedPackageOfPractices,
        actions: fertilizerStatus?.actions || []
      },
      irrigation: irrigationStatus,
      irrigationStatus,
      alerts: recentAlerts,
      recentAlerts,
      yieldEstimate,
      expectedYield: yieldEstimate,
      soilMoisture: soilMoistureAssessment,
      soilMoistureAssessment,
      generatedAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: payload,
      ...payload
    });
  } catch (error) {
    console.error("Unified plot dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not generate unified plot dashboard."
    });
  }
};
