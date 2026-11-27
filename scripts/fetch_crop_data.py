import requests

url = "https://raw.githubusercontent.com/Vishnukurra101/crop-production-india/main/crop_production.csv"
print("Downloading crop production dataset...")
r = requests.get(url, timeout=20)
print("Status:", r.status_code, "Length:", len(r.content))

with open("c:/Users/dines/Documents/Projects/AgriSaarthi/data/raw/crop_production_india.csv", "wb") as f:
    f.write(r.content)
print("Saved raw crop production file.")
