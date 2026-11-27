import requests
import re
import json

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def check_url(name, url):
    print(f"\n--- Checking {name}: {url} ---")
    try:
        r = requests.get(url, headers=headers, timeout=12)
        print(f"Status: {r.status_code}, Length: {len(r.text)}")
        links = re.findall(r'href=["\']([^"\']*(?:download|\.csv|\.json|\.parquet|resource|api)[^"\']*)["\']', r.text, re.IGNORECASE)
        print(f"Found {len(links)} links:")
        for l in links[:10]:
            print("  ", l)
    except Exception as e:
        print("Error:", e)

check_url("Dataful Soil Health", "https://dataful.in/datasets/24072/")
check_url("OpenCity Rainfall", "https://data.opencity.in/dataset/karnataka-annual-rainfall-districts-taluks-and-hoblis")
