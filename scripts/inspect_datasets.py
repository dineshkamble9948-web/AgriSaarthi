import pandas as pd
import numpy as np

# 1. Inspect crop production data
df_crop = pd.read_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/crop_production_karnataka.csv")
print("=== CROP PRODUCTION ===")
print("Rows:", len(df_crop))
print("Districts in crop data:", df_crop['District_Name'].nunique())
print("Top 10 crops by total production:")
crop_prod = df_crop.groupby('Crop')['Production'].sum().sort_values(ascending=False).head(10)
print(crop_prod)

# 2. Inspect rainfall data
df_rain = pd.read_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/rainfall_karnataka_districts.csv")
print("\n=== RAINFALL ===")
print("Rows:", len(df_rain))
print("Columns:", df_rain.columns.tolist())
print(df_rain[['DISTRICT', 'ANNUAL', 'Jun-Sep', 'Oct-Dec']].head(5))

# 3. Inspect NFSM soil data
df_soil_sample = pd.read_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/soil_health_nfsm_karnataka.csv")
print("\n=== NFSM SOIL HEALTH SAMPLE ===")
print("Rows:", len(df_soil_sample))
print("Taluks in NFSM:", df_soil_sample['taluku'].dropna().unique())
print("Parameters available:", [c for c in ['avl_n', 'avl_p', 'avl_k', 'avl_oc', 'ph', 'zn', 'fe', 'cu', 'mn', 'avl_b', 'avl_s'] if c in df_soil_sample.columns])
