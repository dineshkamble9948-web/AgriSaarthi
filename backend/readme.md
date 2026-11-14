
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

## Author

Dinesh
