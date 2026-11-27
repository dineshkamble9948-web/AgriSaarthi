import requests

r = requests.get("https://api.github.com/repos/Raghavendramy09/crop-recommendation/contents", timeout=10)
print("Contents:", r.status_code)
if r.status_code == 200:
    for item in r.json():
        print(item.get("name"), item.get("download_url"))
