import pandas as pd

df = pd.read_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/crop_production_india.csv")
print("Columns:", df.columns.tolist())
print("Total rows:", len(df))

# Filter for Karnataka
kar_df = df[df['State_Name'].str.strip().str.lower() == 'karnataka'].copy()
print("Karnataka rows:", len(kar_df))
print("Districts in Karnataka:", kar_df['District_Name'].nunique(), sorted(kar_df['District_Name'].unique()))
print("Years:", kar_df['Crop_Year'].min(), "to", kar_df['Crop_Year'].max())
print("Seasons:", kar_df['Season'].unique().tolist())
print("Crops count:", kar_df['Crop'].nunique())
print("Sample crops:", kar_df['Crop'].unique()[:15])

# Save as raw karnataka crop production
kar_df.to_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/crop_production_karnataka.csv", index=False)
print("Saved data/raw/crop_production_karnataka.csv successfully!")
