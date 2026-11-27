import requests
import pandas as pd
import io

url = "https://raw.githubusercontent.com/Raghavendramy09/crop-recommendation/main/Updated_Rainfall_Dataset.csv"
print("Downloading Updated_Rainfall_Dataset.csv...")
r = requests.get(url, timeout=15)
print("Status:", r.status_code, "Length:", len(r.content))

if r.status_code == 200:
    df = pd.read_csv(io.StringIO(r.text))
    print("Columns:", df.columns.tolist())
    print("Total rows:", len(df))
    print("Head:\n", df.head(3))
    df.to_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/rainfall_taluk_karnataka.csv", index=False)
    print("Saved to data/raw/rainfall_taluk_karnataka.csv")
