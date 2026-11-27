import pandas as pd

df = pd.read_csv("c:/Users/dines/Documents/Projects/AgriSaarthi/ml-service/dataset/Crop_recommendation.csv")
print("Crops:", df['label'].unique().tolist())
stats = df.groupby('label').agg({
    'N': ['min', 'mean', 'max'],
    'P': ['min', 'mean', 'max'],
    'K': ['min', 'mean', 'max'],
    'ph': ['min', 'mean', 'max'],
    'rainfall': ['min', 'mean', 'max']
})
print(stats.head(6))
