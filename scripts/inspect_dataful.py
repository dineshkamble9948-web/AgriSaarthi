import requests
import json

headers = {"User-Agent": "Mozilla/5.0"}
for ep in [
    "https://dataful.in/api/datasets/24072/",
    "https://dataful.in/api/v1/datasets/24072/",
    "https://dataful.in/api/dataset/24072/",
    "https://dataful.in/api/records/24072/",
]:
    r = requests.get(ep, headers=headers)
    print(ep, "->", r.status_code)
    if r.status_code == 200:
        print("Response:", r.text[:300])
