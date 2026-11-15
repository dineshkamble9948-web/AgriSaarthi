
# AgriSaarthi 🌱

**From Data to Decisions – Personalized Intelligence for Every Farmer**

AgriSaarthi is an AI-powered smart agriculture platform
that helps farmers make better farming decisions.

## Core Features

1. Crop Recommendation
2. Crop Disease Detection
3. Weather Monitoring and Alerts
4. Fertilizer Recommendation
5. Farm History
6. Personal Farm Digital Twin
7. What-If Farm Simulation
8. Next-Best-Action Engine
9. Agricultural Market Intelligence

## Technology Stack

- React.js
- Node.js
- Express.js
- MongoDB
- Python
- FastAPI
- Scikit-learn
- PyTorch / TensorFlow

## Project Status

Under Development.

## Pl@ntNet disease detection

The authenticated disease routes are available at `/api/disease`:

- `GET /catalog` — returns Pl@ntNet's identifiable disease catalog.
- `POST /analyze` — accepts a multipart `file` (JPEG or PNG, up to 5 MB) and a `crop` field.
- `GET /history` — returns recent analyses for the signed-in user.

Set `PLANTNET_API_KEY` in `backend/.env` before starting the backend. Never put this key in frontend code. The crop is saved as context; Pl@ntNet's disease-identification endpoint does not accept a crop filter. Matches and confidence scores are returned as possible identifications, not confirmed diagnoses.

## Market Intelligence

The authenticated market routes use the keyless Mandi Price API at `https://mandi-api.onrender.com/v1`. The linked [API documentation](https://mandi-api.vercel.app/docs) is hosted on Vercel; do not call that site as the API host.

- `GET /api/market/options` returns supported states, or the districts and mandis available in a selected state.
- `GET /api/market/prices` accepts `state` or `commodity`, plus optional `district`, `market`, and `date` (`YYYY-MM-DD`). District matching is applied to source results because the upstream API has no district query filter.
- `GET /api/market/prices/history` requires `state` and `commodity`, and accepts optional `market`, `district`, `from`, and `to`. Upstream history is state-aggregated unless a mandi is selected; a district-specific trend therefore requires a mandi selection.

The upstream price endpoint returns at most 200 recent matching rows and does not support pagination. Its response arrival date is the authoritative date shown in the UI; data can lag behind the current day.

Successful price searches are cached in MongoDB for 15 minutes; stale cached prices remain available if the external API is down. In local fallback mode, the same cache behavior uses bounded in-memory storage. No Mandi API key is required.

## Soil Intelligence

The authenticated soil routes are available at `/api/soil`:

- `POST /lookup` accepts numeric `latitude` and `longitude`, validates their geographic ranges, retrieves SoilGrids mean estimates for the 0–5 cm layer, and saves the assessment. Optional `farmId` and `plotId` associate the report with an owned farm and plot; when coordinates are omitted for a farm lookup, its saved center coordinates are used.
- `POST /recommendations` accepts the farm coordinates, crop, optional laboratory pH, N/P/K laboratory values, units (`kg/ha` or `mg/kg`), and the laboratory's own nutrient status (`low`, `medium`, `adequate`, `high`, or `unknown`). Optional `farmId` and `plotId` associate a new report with an owned farm/plot; `assessmentId` updates an owned existing report.
- `GET /history` returns up to 20 assessments belonging to the signed-in farmer. Optional `farmId` and `plotId` filter the history to an owned farm/plot.

SoilGrids uses the properties `phh2o`, `nitrogen`, `soc`, `clay`, `sand`, `silt`, and `cec`. Values are requested as `mean`; SoilGrids unit scale factors are applied before display. Nitrogen and organic carbon are shown in g/kg, texture fractions in percent, CEC in cmol(c)/kg, and pH as pH. SoilGrids data is explicitly modelled; it is not a laboratory NPK test. Missing values remain unavailable rather than being inferred. Successful provider responses are cached in bounded backend memory for six hours.

SoilGrids can be intermittently unavailable. The backend returns a provider error instead of sample readings. The `SoilDataProvider` boundary in `services/soilDataService.js` allows another provider to be added without moving provider calls into the frontend. `SOILGRIDS_API_URL` optionally overrides the SoilGrids query endpoint; the API does not require a key. Fertilizer advice uses nutrient status as interpreted by the farmer's lab, identifies fertilizer product types and general handling guidance, and intentionally does not calculate doses without reliable crop- and region-specific recommendations.

Assessments are saved in MongoDB as `SoilAssessment` documents and scoped to the authenticated farmer. If MongoDB is not configured, they use the same process-local fallback store used by the rest of the application.

## Farm locations and plots

Farm profiles now accept optional GPS coordinates and a GeoJSON Polygon boundary. The backend validates coordinate ranges and calculates area from a submitted boundary; manually entered area remains supported when a boundary is unavailable. Geolocation permission is optional.

- `GET /api/farms` returns the signed-in farmer's farms.
- `GET /api/farms/me` remains available for existing clients and returns the first farm.
- `POST /api/farms` creates the initial farm or updates the first farm for legacy callers. Include `createNew: true` to add another farm or `farmId` to update a specific farm.
- `GET /api/farms/:farmId/plots` lists plots for an owned farm.
- `POST /api/farms/:farmId/plots` creates a plot.
- `PATCH /api/farms/:farmId/plots/:plotId` updates an owned plot.

Farm and plot endpoints require authentication and verify owner scope. Farm boundaries and plot boundaries use GeoJSON `Polygon` coordinates in `[longitude, latitude]` order. Plot area can be calculated from its polygon.

Before using multiple farms in a MongoDB database created with the former one-farm-per-owner schema, stop the backend and run `npm run migrate:farms` from `backend`. This removes only the legacy unique `owner_1` index; it does not delete farm documents. No migration is needed for a new database or local fallback mode. Fallback data remains in memory and is cleared when the backend stops.

## Crop lifecycle

Crop cycles are stored separately from activity records and scoped to an owned farm, with an optional plot association:

- `GET /api/farms/:farmId/crops` lists crop cycles.
- `POST /api/farms/:farmId/crops` creates a cycle with `cropName`, `sowingDate`, and farmer-entered `expectedHarvestDate`; `cropVariety`, `plotId`, and `irrigationMethod` are optional.
- `PATCH /api/farms/:farmId/crops/:cycleId` updates cycle details or manually sets `growthStage`.

The estimated duration is calculated from the farmer-entered sowing and expected harvest dates. Stage estimates are a date-based timeline, not a crop-phenology sensor or a locally calibrated agronomic model. A manually selected stage is labeled as farmer-updated and takes precedence over the date estimate.

## Sentinel-2 vegetation monitoring

The authenticated farm satellite endpoints use Copernicus Data Space Sentinel Hub:

- `GET /api/farms/:farmId/satellite` requests the last 90 days of Sentinel-2 L2A NDVI statistics in 10-day intervals and returns a colorized NDVI PNG when available.
- `GET /api/farms/:farmId/satellite/history` returns stored observations. Both routes accept optional `plotId`; custom monitoring ranges accept `from` and `to` ISO dates (maximum 365 days).

Create a Copernicus Data Space OAuth client and set `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET` in `backend/.env`. The backend obtains short-lived OAuth tokens and calls the official [Statistical API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html) (`/statistics/v1`) and [Process API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html) (`/process/v1`). Credentials are never sent to the frontend. The service caches successful responses for six hours and saves NDVI series in `SatelliteMonitoring`.

Farm or plot boundaries are used when available. If only a center coordinate exists, the API analyzes an explicitly labeled approximate location buffer, not a claimed farm boundary. NDVI uses red/NIR reflectance from real Sentinel-2 observations and masks cloud, shadow, water, snow, and no-data pixels. The poor/moderate/healthy categories use generic thresholds and are not crop-specific. Missing credentials, provider failures, and dates without usable observations are reported as unavailable; no imagery or NDVI values are synthesized.

## Irrigation guidance

`GET /api/farms/:farmId/irrigation` generates an authenticated, non-prescriptive recommendation from the farm's current crop cycle, available soil report, soil type, and OpenWeather forecast. Optional `plotId` scopes the crop and soil report to a plot. The response includes its evidence, missing inputs, weather errors, and a note that no sensor moisture reading or irrigation quantity is available. Rainfall decision thresholds are planning heuristics and are not locally calibrated.

Set `OPENWEATHER_API_KEY` in `backend/.env` for forecast-backed guidance. If weather or crop information is missing, the endpoint marks the result as insufficient instead of inventing an irrigation decision. Actual irrigation activities continue to use the existing agricultural records API.

## Digital Twin dashboard and alerts

The authenticated `Farm Digital Twin` dashboard loads the signed-in farmer's farms and displays farm/plot boundaries, OpenWeather conditions and forecast history, linked soil reports, crop-cycle progress, Sentinel-2 NDVI, irrigation guidance, and recorded irrigation activities. Each provider section reports unavailable data independently; the dashboard does not fill gaps with sample readings.

- `GET /api/farms/:farmId/alerts` derives current alerts from recent stored OpenWeather forecasts (24 hours), Sentinel-2 observations (30 days), and farmer-entered crop timelines, then upserts them as `FarmAlert` documents.
- `PATCH /api/farms/:farmId/alerts/:alertId/acknowledge` acknowledges an active alert owned by the signed-in farmer.
- `GET /api/records?farmId=<farmId>&activityType=Irrigation` lists irrigation activities for one owned farm. `POST /api/records` also accepts an optional `farmId`; records without it retain the legacy first-farm behavior.

Farm alerts are owner- and farm-scoped, deduplicated by their source observation, and persisted in MongoDB (or the existing process-local fallback store). Alert generation only uses available forecast, satellite, and farmer-entered timeline evidence. Generic low NDVI is a prompt to inspect the field, not a crop diagnosis; irrigation guidance does not infer moisture or water stress without a sensor.

To start the application locally, configure `backend/.env` using `.env.example`, then run `npm install` and `npm run dev` in `backend`. In a second terminal, run `npm install` and `npm run dev` in `frontend`. MongoDB is optional for local development; without `MONGO_URI`, fallback storage is in-memory and is cleared when the backend stops.

## Author

Dinesh
