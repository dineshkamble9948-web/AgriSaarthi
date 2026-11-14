const fallbackStore = {
  users: [],
  farms: [],
  records: [],
  diseaseReports: []
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

export const createUser = ({ name, email, password }) => {
  const user = {
    id: `user_${Date.now()}_${fallbackStore.users.length + 1}`,
    _id: `user_${Date.now()}_${fallbackStore.users.length + 1}`,
    name: String(name || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    password,
    role: "farmer",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  fallbackStore.users.push(user);
  return user;
};

export const getFarmByOwner = (ownerId) => {
  const target = normalizeId(ownerId);

  return fallbackStore.farms.find(
    (farm) => normalizeId(farm.owner) === target
  );
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

export const listRecordsByOwner = (ownerId) => {
  const target = normalizeId(ownerId);

  return fallbackStore.records
    .filter((record) => normalizeId(record.owner) === target)
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

export default fallbackStore;
