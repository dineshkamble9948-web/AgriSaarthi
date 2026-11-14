import {
  getMandiOptions,
  getMandiPriceHistory,
  getMandiPrices,
  MandiApiError
} from "../services/marketPriceService.js";

const FILTER_FIELDS = ["state", "district", "commodity", "market"];

const invalidRequest = (res, message) => res.status(400).json({
  success: false,
  message
});

const readFilter = (query, name, maximumLength = 100) => {
  const value = query[name];
  if (value === undefined || value === "") return { value: "", error: "" };
  if (typeof value !== "string" || value.trim().length > maximumLength) {
    return { value: "", error: `${name} must be ${maximumLength} characters or fewer.` };
  }
  return { value: value.trim(), error: "" };
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const readFilters = (query, names) => {
  const filters = {};
  for (const name of names) {
    const result = readFilter(query, name);
    if (result.error) return { error: result.error };
    if (result.value) filters[name] = result.value;
  }
  return { filters };
};

const sendServiceError = (res, error, label) => {
  if (error instanceof MandiApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }

  console.error(`${label} failed:`, error);
  return res.status(502).json({
    success: false,
    message: "Market prices are temporarily unavailable. Please try again."
  });
};

export const getMarketOptions = async (req, res) => {
  const parsed = readFilters(req.query, ["state"]);
  if (parsed.error) return invalidRequest(res, parsed.error);

  try {
    const options = await getMandiOptions(parsed.filters.state || "");
    return res.status(200).json({ success: true, ...options });
  } catch (error) {
    return sendServiceError(res, error, "Market option request");
  }
};

export const getMarketPrices = async (req, res) => {
  const parsed = readFilters(req.query, FILTER_FIELDS);
  if (parsed.error) return invalidRequest(res, parsed.error);

  const date = readFilter(req.query, "date");
  if (date.error) return invalidRequest(res, date.error);
  if (date.value && !isValidDate(date.value)) {
    return invalidRequest(res, "date must be a valid YYYY-MM-DD date.");
  }

  const filters = { ...parsed.filters, date: date.value };
  if (!filters.state && !filters.commodity) {
    return invalidRequest(res, "Choose a state or enter a crop before searching.");
  }

  try {
    const result = await getMandiPrices(filters);
    return res.status(200).json({
      success: true,
      source: "Mandi Price API",
      ...result
    });
  } catch (error) {
    return sendServiceError(res, error, "Market price request");
  }
};

export const getMarketPriceHistory = async (req, res) => {
  const parsed = readFilters(req.query, [...FILTER_FIELDS, "from", "to"]);
  if (parsed.error) return invalidRequest(res, parsed.error);

  for (const dateField of ["from", "to"]) {
    if (parsed.filters[dateField] && !isValidDate(parsed.filters[dateField])) {
      return invalidRequest(res, `${dateField} must be a valid YYYY-MM-DD date.`);
    }
  }

  if (!parsed.filters.state || !parsed.filters.commodity) {
    return invalidRequest(res, "Choose a state and enter a crop to view price history.");
  }

  try {
    const result = await getMandiPriceHistory(parsed.filters);
    return res.status(200).json({
      success: true,
      source: "Mandi Price API",
      ...result
    });
  } catch (error) {
    return sendServiceError(res, error, "Market price history request");
  }
};
