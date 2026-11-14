# AgriSaarthi crop recommendation model

The crop recommender is a Random Forest classifier trained on `Crop_recommendation.csv`. It uses the dataset features in this exact order:

`N`, `P`, `K`, `temperature`, `humidity`, `ph`, `rainfall`

The model returns the three crop labels with the highest Random Forest class scores. These scores describe model output for this dataset; they are not probabilities of farming success or yield guarantees.

## Dataset

Place the dataset at:

`ml-service/dataset/Crop_recommendation.csv`

The CSV must include the seven feature columns above and a `label` column. The trainer converts invalid feature cells to missing values for median imputation, drops rows without a target label, removes duplicate records, and stops with a clear error if required columns are absent or a crop class cannot be stratified.

## Install and train (Windows)

From the project root:

```powershell
cd ml-service
py -m pip install -r requirements.txt
py train_model.py
```

`pip install` installs FastAPI, Pandas, NumPy, scikit-learn, Joblib, and image-service dependencies. `py train_model.py` performs an 80/20 stratified split, trains a 300-tree Random Forest with a fixed random seed, evaluates the held-out test set, and writes:

- `crop_model.pkl` — fitted imputer and Random Forest, feature order, and metadata
- `model_metadata.json` — metrics, confusion matrix, class labels, feature importance, and dataset summary

Optional arguments:

```powershell
py train_model.py --data "C:\path\to\Crop_recommendation.csv" --estimators 300
```

The dataset and model paths can also be set with `CROP_DATASET_PATH` and `CROP_MODEL_PATH`.

## Run the services

Keep each service running in its own terminal:

```powershell
cd ml-service
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

The Express proxy defaults to `http://localhost:8000`. Configure `ML_API_URL` in the backend environment to use a different FastAPI address.

## API

- `GET /` — health and model availability
- `GET /model-info` — supported features/crops, evaluation metrics, and feature importance
- `POST /recommend` — top three crop predictions
- `POST /predict-disease` — legacy heuristic image service. The React disease page now uses the authenticated Express route and Pl@ntNet; this ML endpoint is not used for disease detection in the frontend.

The frontend sends crop inputs to the authenticated Express route `POST /api/crops/recommend`; Express validates and forwards them to FastAPI. The model endpoint accepts numeric JSON fields `N`, `P`, `K`, `temperature`, `humidity`, `ph`, and `rainfall`.

Example request body:

```json
{
  "N": 90,
  "P": 42,
  "K": 43,
  "temperature": 20.88,
  "humidity": 82.0,
  "ph": 6.5,
  "rainfall": 202.94
}
```

The example values illustrate the request format only. Use values measured for the farmer's field. Input units and collection methods should match the dataset's conventions.
