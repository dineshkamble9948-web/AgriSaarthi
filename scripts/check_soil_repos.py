import requests
import io
import pandas as pd

urls = [
    ("Google Research India Soil Health Card", "https://raw.githubusercontent.com/google-research-datasets/india-soil-health-card/main/README.md"),
    ("Google Research Soil Data", "https://raw.githubusercontent.com/google-research-datasets/india-soil-health-card/master/README.md"),
    ("Raghavendramy09 Soil Data", "https://raw.githubusercontent.com/Raghavendramy09/crop-recommendation/main/data/soil_data.csv"),
    ("Raghavendramy09 Main Repo", "https://raw.githubusercontent.com/Raghavendramy09/crop-recommendation/master/README.md")
]

for name, url in urls:
    try:
        r = requests.get(url, timeout=10)
        print(name, "->", r.status_code, "len:", len(r.content))
        if r.status_code == 200:
            print("Preview:", r.text[:300])
    except Exception as e:
        print("Error:", e)
