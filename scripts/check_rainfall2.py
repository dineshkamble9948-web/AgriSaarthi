import requests
import pandas as pd
import io

candidates = [
    "https://raw.githubusercontent.com/VinodLouis/indian-state-district-wise-rainfall-stats/master/district%20rainfall%20normal.csv",
    "https://raw.githubusercontent.com/VinodLouis/indian-state-district-wise-rainfall-stats/main/district%20rainfall%20normal.csv",
    "https://raw.githubusercontent.com/alok-ai-lab/India-Rainfall-Prediction-Data/master/district%20rainfall%20normal.csv",
    "https://raw.githubusercontent.com/alok-ai-lab/India-Rainfall-Prediction-Data/main/district%20rainfall%20normal.csv"
]

for url in candidates:
    try:
        r = requests.get(url, timeout=10)
        print(url, "->", r.status_code, "len:", len(r.content))
        if r.status_code == 200:
            df = pd.read_csv(io.StringIO(r.text))
            print("Columns:", df.columns.tolist())
            print("Sample state names:", df.iloc[:, 0].unique()[:5])
            break
    except Exception as e:
        print("Error:", e)
