import pandas as pd
import numpy as np
import os

PROCESSED_DIR = "c:/Users/dines/Documents/Projects/AgriSaarthi/data/processed"

df_soil = pd.read_csv(os.path.join(PROCESSED_DIR, "clean_soil_data.csv"))
df_rain = pd.read_csv(os.path.join(PROCESSED_DIR, "clean_rainfall.csv"))
df_crops = pd.read_csv(os.path.join(PROCESSED_DIR, "clean_crop_production.csv"))

print("Loaded datasets:")
print("Soil rows:", len(df_soil), "Districts:", df_soil['district'].nunique())
print("Rainfall rows:", len(df_rain), "Districts:", df_rain['district'].nunique())
print("Crop prod rows:", len(df_crops), "Districts:", df_crops['district'].nunique())

# Check Raichur
print("\n--- Raichur Sample ---")
r_soil = df_soil[(df_soil['district'] == 'Raichur') & (df_soil['data_level'] == 'District Benchmark')].iloc[0]
print("Raichur Soil:", r_soil['nitrogen_kg_ha'], "N,", r_soil['phosphorus_kg_ha'], "P,", r_soil['potassium_kg_ha'], "K, pH:", r_soil['ph'])

r_rain = df_rain[df_rain['district'] == 'Raichur'].iloc[0]
print("Raichur Rainfall:", r_rain['annual_rainfall_mm'], "mm, Kharif:", r_rain['kharif_rainfall_mm'], "mm")

r_crops = df_crops[df_crops['district'] == 'Raichur'].groupby('canonical_crop')['production_tonnes'].sum().sort_values(ascending=False).head(5)
print("Raichur Top Crops:\n", r_crops)
