import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}

url = "https://data.opencity.in/api/3/action/package_show?id=karnataka-annual-rainfall-districts-taluks-and-hoblis"
try:
    r = requests.get(url, headers=headers, timeout=10)
    print("CKAN Status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        resources = data.get("result", {}).get("resources", [])
        print("Found resources:", len(resources))
        for res in resources:
            print("Resource:", res.get("name"), res.get("url"))
    else:
        print("Response:", r.text[:300])
except Exception as e:
    print("Error:", e)
