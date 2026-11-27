import requests
import pandas as pd
import io

url = "https://raw.githubusercontent.com/Osprey-DS/Rainfall-Measurement-in-INDIA-in-the-time-of-1901-to-2015/master/district%20wise%20rainfall%20normal.csv"
print("Fetching from:", url)
r = requests.get(url, timeout=15)
print("Status:", r.status_code, "Length:", len(r.content))

if r.status_code == 200:
    df = pd.read_csv(io.StringIO(r.text))
    print("Columns:", df.columns.tolist())
    print("Total rows:", len(df))
    # Filter for Karnataka
    kar = df[df['STATE_UT_NAME'].str.upper() == 'KARNATAKA'].copy()
    print("Karnataka rows:", len(kar))
    print("Karnataka districts:", kar['DISTRICT'].tolist())
    kar.to_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/rainfall_karnataka_districts.csv", index=False)
    print("Saved rainfall_karnataka_districts.csv!")
