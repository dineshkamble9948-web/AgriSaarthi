import requests
import pandas as pd
import io

urls = [
    ("IMD District Normal", "https://raw.githubusercontent.com/sudheerachary/rainfall-prediction/master/district%20rainfall%20normal.csv"),
    ("IMD 1901-2015", "https://raw.githubusercontent.com/chandanverma07/DataSets/master/rainfall%20in%20india%201901-2015.csv")
]

for name, url in urls:
    try:
        print(f"Fetching {name} from {url}...")
        r = requests.get(url, timeout=15)
        print(f"Status: {r.status_code}, Length: {len(r.content)}")
        if r.status_code == 200:
            df = pd.read_csv(io.StringIO(r.text))
            print("Columns:", df.columns.tolist()[:10])
            print("Total rows:", len(df))
            if 'STATE_UT_NAME' in df.columns:
                kar = df[df['STATE_UT_NAME'].str.upper() == 'KARNATAKA']
                print("Karnataka rows:", len(kar))
                print("Districts:", kar['DISTRICT'].unique()[:10])
                kar.to_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/rainfall_karnataka_districts.csv", index=False)
                print("Saved rainfall_karnataka_districts.csv successfully!")
            elif 'SUBDIVISION' in df.columns:
                kar = df[df['SUBDIVISION'].str.contains('KARNATAKA', case=False, na=False)]
                print("Karnataka subdivision rows:", len(kar))
    except Exception as e:
        print("Error:", e)
