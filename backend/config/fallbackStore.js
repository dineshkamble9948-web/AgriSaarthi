const fallbackStore = {
  users: [],
  farms: [],
  farmPlots: [],
  cropCycles: [],
  records: [],
  diseaseReports: [],
  soilAssessments: [],
  weatherHistory: [],
  satelliteMonitoring: [],
  farmAlerts: []
};

let fallbackModeEnabled = false;

export const setFallbackMode = (enabled) => {
  fallbackModeEnabled = enabled;
};

export const isFallbackMode = () => fallbackModeEnabled;

const normalizeId = (id) => String(id);

export const findUserByEmail = (email) => {
  const target = String(email || "").trim().toLowerCase();

  return fallbackStore.users.find((user) =>
    String(user.email || "").trim().toLowerCase() === target
  );
};

export const findUserById = (id) => {
  const target = normalizeId(id);

  return fallbackStore.users.find((user) => normalizeId(user.id || user._id) === target);
};

export const createUser = ({ name, email, password, state = "", district = "", village = "", city = "", pincode = "", latitude = null, longitude = null }) => {
  const user = {
    id: `user_${Date.now()}_${fallbackStore.users.length + 1}`,
    _id: `user_${Date.now()}_${fallbackStore.users.length + 1}`,
    name: String(name || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    password,
    role: "farmer",
    state: String(state || "").trim(),
    district: String(district || "").trim(),
    village: String(village || "").trim(),
    city: String(city || "").trim(),
    pincode: String(pincode || "").trim(),
    latitude: latitude == null ? null : Number(latitude),
    longitude: longitude == null ? null : Number(longitude),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  fallbackStore.users.push(user);
  return user;
};

export const updateUserLocation = (userId, locationData) => {
  const target = normalizeId(userId);
  const user = fallbackStore.users.find((u) => normalizeId(u.id || u._id) === target);

  if (user) {
    if (locationData.state !== undefined) user.state = String(locationData.state || "").trim();
    if (locationData.district !== undefined) user.district = String(locationData.district || "").trim();
    if (locationData.taluk !== undefined) user.taluk = String(locationData.taluk || "").trim();
    if (locationData.village !== undefined) user.village = String(locationData.village || "").trim();
    if (locationData.city !== undefined) user.city = String(locationData.city || "").trim();
    if (locationData.pincode !== undefined) user.pincode = String(locationData.pincode || "").trim();
    if (locationData.farmLocation !== undefined) user.farmLocation = String(locationData.farmLocation || "").trim();
    if (locationData.latitude !== undefined) user.latitude = locationData.latitude == null ? null : Number(locationData.latitude);
    if (locationData.longitude !== undefined) user.longitude = locationData.longitude == null ? null : Number(locationData.longitude);
    user.updatedAt = new Date().toISOString();
  }

  return user || null;
};

export const updateUserProfile = (userId, profileData) => {
  const target = normalizeId(userId);
  const user = fallbackStore.users.find((u) => normalizeId(u.id || u._id) === target);

  if (user) {
    if (profileData.name !== undefined) user.name = String(profileData.name || "").trim();
    if (profileData.phoneNumber !== undefined) user.phoneNumber = String(profileData.phoneNumber || "").trim();
    if (profileData.preferredLanguage !== undefined) user.preferredLanguage = String(profileData.preferredLanguage || "en").trim();
    if (profileData.state !== undefined) user.state = String(profileData.state || "").trim();
    if (profileData.district !== undefined) user.district = String(profileData.district || "").trim();
    if (profileData.taluk !== undefined) user.taluk = String(profileData.taluk || "").trim();
    if (profileData.village !== undefined) user.village = String(profileData.village || "").trim();
    if (profileData.city !== undefined) user.city = String(profileData.city || "").trim();
    if (profileData.pincode !== undefined) user.pincode = String(profileData.pincode || "").trim();
    if (profileData.farmLocation !== undefined) user.farmLocation = String(profileData.farmLocation || "").trim();
    if (profileData.latitude !== undefined) user.latitude = profileData.latitude == null ? null : Number(profileData.latitude);
    if (profileData.longitude !== undefined) user.longitude = profileData.longitude == null ? null : Number(profileData.longitude);
    if (profileData.totalLandArea !== undefined) user.totalLandArea = profileData.totalLandArea == null ? 0 : Number(profileData.totalLandArea);
    if (Array.isArray(profileData.farmingHistory)) user.farmingHistory = profileData.farmingHistory;
    user.updatedAt = new Date().toISOString();
  }

  return user || null;
};

export const getFarmByOwner = (ownerId) => {
  const target = normalizeId(ownerId);

  return fallbackStore.farms.find(
    (farm) => normalizeId(farm.owner) === target
  );
};

export const listFarmsByOwner = (ownerId) => {
  const target = normalizeId(ownerId);
  return fallbackStore.farms
    .filter((farm) => normalizeId(farm.owner) === target)
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
};

export const findFarmByIdAndOwner = (farmId, ownerId) => {
  const targetOwner = normalizeId(ownerId);
  return fallbackStore.farms.find((farm) => (
    normalizeId(farm._id) === normalizeId(farmId)
    && normalizeId(farm.owner) === targetOwner
  )) || null;
};

export const upsertFarm = (ownerId, payload) => {
  const target = normalizeId(ownerId);
  const existingFarm = fallbackStore.farms.find(
    (farm) => normalizeId(farm.owner) === target
  );

  if (existingFarm) {
    Object.assign(existingFarm, {
      ...payload,
      owner: target,
      updatedAt: new Date().toISOString()
    });

    return existingFarm;
  }

  const newFarm = {
    _id: `farm_${Date.now()}_${fallbackStore.farms.length + 1}`,
    id: `farm_${Date.now()}_${fallbackStore.farms.length + 1}`,
    owner: target,
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  fallbackStore.farms.push(newFarm);
  return newFarm;
};

export const createFarmEntry = (ownerId, payload) => {
  const timestamp = new Date().toISOString();
  const farmId = `farm_${Date.now()}_${fallbackStore.farms.length + 1}`;
  const farm = {
    _id: farmId,
    id: farmId,
    owner: normalizeId(ownerId),
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  fallbackStore.farms.push(farm);
  return farm;
};

export const updateFarmEntry = (farmId, ownerId, payload) => {
  const farm = findFarmByIdAndOwner(farmId, ownerId);
  if (!farm) {
    return null;
  }

  Object.assign(farm, payload, { updatedAt: new Date().toISOString() });
  return farm;
};

export const listFarmPlots = (farmId, ownerId) => {
  const targetFarm = normalizeId(farmId);
  const targetOwner = normalizeId(ownerId);
  return fallbackStore.farmPlots
    .filter((plot) => (
      normalizeId(plot.farm) === targetFarm
      && normalizeId(plot.owner) === targetOwner
    ))
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
};

export const createFarmPlotEntry = (ownerId, farmId, payload) => {
  const timestamp = new Date().toISOString();
  const plotId = `plot_${Date.now()}_${fallbackStore.farmPlots.length + 1}`;
  const plot = {
    _id: plotId,
    id: plotId,
    owner: normalizeId(ownerId),
    farm: normalizeId(farmId),
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  fallbackStore.farmPlots.push(plot);
  return plot;
};

export const updateFarmPlotEntry = (plotId, farmId, ownerId, payload) => {
  const targetPlot = normalizeId(plotId);
  const targetFarm = normalizeId(farmId);
  const targetOwner = normalizeId(ownerId);
  const plot = fallbackStore.farmPlots.find((item) => (
    normalizeId(item._id) === targetPlot
    && normalizeId(item.farm) === targetFarm
    && normalizeId(item.owner) === targetOwner
  ));

  if (!plot) {
    return null;
  }

  Object.assign(plot, payload, { updatedAt: new Date().toISOString() });
  return plot;
};

export const findFarmPlotById = (plotId, ownerId) => {
  const targetPlot = normalizeId(plotId);
  const targetOwner = normalizeId(ownerId);
  return fallbackStore.farmPlots.find((item) => (
    normalizeId(item._id) === targetPlot
    && (targetOwner == null || normalizeId(item.owner) === targetOwner)
  )) || null;
};

export const deleteFarmPlotEntry = (plotId, farmId, ownerId) => {
  const targetPlot = normalizeId(plotId);
  const targetFarm = normalizeId(farmId);
  const targetOwner = normalizeId(ownerId);
  const initialCount = fallbackStore.farmPlots.length;

  fallbackStore.farmPlots = fallbackStore.farmPlots.filter((item) => !(
    normalizeId(item._id) === targetPlot
    && normalizeId(item.farm) === targetFarm
    && normalizeId(item.owner) === targetOwner
  ));

  return fallbackStore.farmPlots.length < initialCount;
};

export const listCropCyclesByFarm = (farmId, ownerId) => {
  const targetFarm = normalizeId(farmId);
  const targetOwner = normalizeId(ownerId);
  return fallbackStore.cropCycles
    .filter((cycle) => (
      normalizeId(cycle.farm) === targetFarm
      && normalizeId(cycle.owner) === targetOwner
    ))
    .sort((left, right) => new Date(right.sowingDate) - new Date(left.sowingDate));
};

export const createCropCycleEntry = (ownerId, farmId, payload) => {
  const timestamp = new Date().toISOString();
  const cycleId = `crop_${Date.now()}_${fallbackStore.cropCycles.length + 1}`;
  const cycle = {
    _id: cycleId,
    id: cycleId,
    owner: normalizeId(ownerId),
    farm: normalizeId(farmId),
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  fallbackStore.cropCycles.push(cycle);
  return cycle;
};

export const updateCropCycleEntry = (cycleId, farmId, ownerId, payload) => {
  const targetCycle = normalizeId(cycleId);
  const targetFarm = normalizeId(farmId);
  const targetOwner = normalizeId(ownerId);
  const cycle = fallbackStore.cropCycles.find((item) => (
    normalizeId(item._id) === targetCycle
    && normalizeId(item.farm) === targetFarm
    && normalizeId(item.owner) === targetOwner
  ));
  if (!cycle) {
    return null;
  }

  Object.assign(cycle, payload, { updatedAt: new Date().toISOString() });
  return cycle;
};

export const createWeatherHistoryEntry = (ownerId, farmId, payload) => {
  const existing = fallbackStore.weatherHistory.find((record) => (
    normalizeId(record.owner) === normalizeId(ownerId)
    && normalizeId(record.farm) === normalizeId(farmId)
    && new Date(record.sourceFetchedAt).getTime() === new Date(payload.sourceFetchedAt).getTime()
  ));
  if (existing) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  const recordId = `weather_${Date.now()}_${fallbackStore.weatherHistory.length + 1}`;
  const record = {
    _id: recordId,
    id: recordId,
    owner: normalizeId(ownerId),
    farm: normalizeId(farmId),
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  fallbackStore.weatherHistory.push(record);
  return record;
};

export const listWeatherHistoryByFarm = (ownerId, farmId, limit = 30) => {
  const targetOwner = normalizeId(ownerId);
  const targetFarm = normalizeId(farmId);
  return fallbackStore.weatherHistory
    .filter((record) => (
      normalizeId(record.owner) === targetOwner
      && normalizeId(record.farm) === targetFarm
    ))
    .sort((left, right) => new Date(right.sourceFetchedAt) - new Date(left.sourceFetchedAt))
    .slice(0, limit);
};

export const saveSatelliteMonitoringEntry = (ownerId, farmId, plotId, payload) => {
  const record = fallbackStore.satelliteMonitoring.find((item) => (
    normalizeId(item.owner) === normalizeId(ownerId)
    && normalizeId(item.farm) === normalizeId(farmId)
    && normalizeId(item.plot || "") === normalizeId(plotId || "")
    && new Date(item.period.from).getTime() === new Date(payload.period.from).getTime()
    && new Date(item.period.to).getTime() === new Date(payload.period.to).getTime()
  ));
  if (record) {
    Object.assign(record, payload, { updatedAt: new Date().toISOString() });
    return record;
  }

  const timestamp = new Date().toISOString();
  const recordId = `satellite_${Date.now()}_${fallbackStore.satelliteMonitoring.length + 1}`;
  const newRecord = {
    _id: recordId,
    id: recordId,
    owner: normalizeId(ownerId),
    farm: normalizeId(farmId),
    plot: plotId ? normalizeId(plotId) : null,
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  fallbackStore.satelliteMonitoring.push(newRecord);
  return newRecord;
};

export const listSatelliteMonitoringByFarm = (ownerId, farmId, plotId, limit = 30) => {
  const targetOwner = normalizeId(ownerId);
  const targetFarm = normalizeId(farmId);
  return fallbackStore.satelliteMonitoring
    .filter((record) => (
      normalizeId(record.owner) === targetOwner
      && normalizeId(record.farm) === targetFarm
      && (plotId == null || normalizeId(record.plot) === normalizeId(plotId))
    ))
    .sort((left, right) => new Date(right.retrievedAt) - new Date(left.retrievedAt))
    .slice(0, limit);
};

export const deactivateFarmAlerts = (ownerId, farmId) => {
  const targetOwner = normalizeId(ownerId);
  const targetFarm = normalizeId(farmId);
  fallbackStore.farmAlerts.forEach((alert) => {
    if (
      normalizeId(alert.owner) === targetOwner
      && normalizeId(alert.farm) === targetFarm
    ) {
      alert.active = false;
      alert.updatedAt = new Date().toISOString();
    }
  });
};

export const upsertFarmAlert = (ownerId, farmId, payload) => {
  const existing = fallbackStore.farmAlerts.find((alert) => (
    normalizeId(alert.owner) === normalizeId(ownerId)
    && normalizeId(alert.farm) === normalizeId(farmId)
    && alert.type === payload.type
    && alert.sourceReference === payload.sourceReference
  ));
  const timestamp = new Date().toISOString();
  if (existing) {
    Object.assign(existing, payload, {
      active: true,
      updatedAt: timestamp
    });
    return existing;
  }

  const alert = {
    _id: `alert_${Date.now()}_${fallbackStore.farmAlerts.length + 1}`,
    id: `alert_${Date.now()}_${fallbackStore.farmAlerts.length + 1}`,
    owner: normalizeId(ownerId),
    farm: normalizeId(farmId),
    acknowledgedAt: null,
    active: true,
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  fallbackStore.farmAlerts.push(alert);
  return alert;
};

export const listFarmAlerts = (ownerId, farmId, activeOnly = true, limit = 30) => {
  const targetOwner = normalizeId(ownerId);
  const targetFarm = normalizeId(farmId);
  return fallbackStore.farmAlerts
    .filter((alert) => (
      normalizeId(alert.owner) === targetOwner
      && normalizeId(alert.farm) === targetFarm
      && (!activeOnly || alert.active)
    ))
    .sort((left, right) => new Date(right.observedAt) - new Date(left.observedAt))
    .slice(0, limit);
};

export const acknowledgeFarmAlertEntry = (alertId, ownerId, farmId) => {
  const alert = fallbackStore.farmAlerts.find((item) => (
    normalizeId(item._id) === normalizeId(alertId)
    && normalizeId(item.owner) === normalizeId(ownerId)
    && normalizeId(item.farm) === normalizeId(farmId)
    && item.active
  ));
  if (!alert) return null;
  alert.acknowledgedAt = new Date().toISOString();
  alert.updatedAt = new Date().toISOString();
  return alert;
};

export const listRecordsByOwner = (ownerId, farmId) => {
  const target = normalizeId(ownerId);

  return fallbackStore.records
    .filter((record) => (
      normalizeId(record.owner) === target
      && (farmId == null || normalizeId(record.farm) === normalizeId(farmId))
    ))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const createRecordEntry = (payload) => {
  const record = {
    _id: `record_${Date.now()}_${fallbackStore.records.length + 1}`,
    id: `record_${Date.now()}_${fallbackStore.records.length + 1}`,
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  fallbackStore.records.push(record);
  return record;
};

export const updateRecordEntry = (recordId, ownerId, updates) => {
  const targetId = normalizeId(recordId);
  const targetOwner = normalizeId(ownerId);

  const index = fallbackStore.records.findIndex(
    (record) =>
      normalizeId(record._id) === targetId && normalizeId(record.owner) === targetOwner
  );

  if (index === -1) {
    return null;
  }

  fallbackStore.records[index] = {
    ...fallbackStore.records[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return fallbackStore.records[index];
};

export const deleteRecordEntry = (recordId, ownerId) => {
  const targetId = normalizeId(recordId);
  const targetOwner = normalizeId(ownerId);

  const index = fallbackStore.records.findIndex(
    (record) =>
      normalizeId(record._id) === targetId && normalizeId(record.owner) === targetOwner
  );

  if (index === -1) {
    return null;
  }

  const [deleted] = fallbackStore.records.splice(index, 1);
  return deleted;
};

export const listDiseaseReportsByOwner = (ownerId) => {
  const target = normalizeId(ownerId);

  return fallbackStore.diseaseReports
    .filter((report) => normalizeId(report.owner) === target)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const createDiseaseReport = (ownerId, payload) => {
  const report = {
    _id: `disease_${Date.now()}_${fallbackStore.diseaseReports.length + 1}`,
    id: `disease_${Date.now()}_${fallbackStore.diseaseReports.length + 1}`,
    owner: normalizeId(ownerId),
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  fallbackStore.diseaseReports.push(report);
  return report;
};

export const listSoilAssessmentsByOwner = (ownerId, farmId, plotId) => {
  const target = normalizeId(ownerId);
  return fallbackStore.soilAssessments
    .filter((assessment) => (
      normalizeId(assessment.farmerId) === target
      && (farmId == null || normalizeId(assessment.farm) === normalizeId(farmId))
      && (plotId == null || normalizeId(assessment.plot) === normalizeId(plotId))
    ))
    .sort((left, right) => (
      new Date(right.retrievedAt || right.createdAt) - new Date(left.retrievedAt || left.createdAt)
    ))
    .slice(0, 20);
};

export const createSoilAssessment = (farmerId, payload) => {
  const timestamp = new Date().toISOString();
  const assessment = {
    _id: `soil_${Date.now()}_${fallbackStore.soilAssessments.length + 1}`,
    id: `soil_${Date.now()}_${fallbackStore.soilAssessments.length + 1}`,
    farmerId: normalizeId(farmerId),
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  fallbackStore.soilAssessments.push(assessment);
  return assessment;
};

export const findSoilAssessmentByIdAndOwner = (assessmentId, farmerId) => {
  const targetOwner = normalizeId(farmerId);
  return fallbackStore.soilAssessments.find((assessment) => (
    normalizeId(assessment._id) === normalizeId(assessmentId)
    && normalizeId(assessment.farmerId) === targetOwner
  )) || null;
};

export const updateSoilAssessment = (assessmentId, farmerId, updates) => {
  const assessment = findSoilAssessmentByIdAndOwner(assessmentId, farmerId);
  if (!assessment) return null;
  Object.assign(assessment, updates, { updatedAt: new Date().toISOString() });
  return assessment;
};

export default fallbackStore;
