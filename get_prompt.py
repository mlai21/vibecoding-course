import urllib.request
import re

url = "https://designprompts.dev/assets/index-FHds4wvP.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
        
        # Look for the prompt string near "modern-dark"
        # Since it might be in an array of objects
        matches = re.findall(r'id:"modern-dark".*?description:"([^"]+)".*?prompt:"([^"]+)"', content)
        if matches:
            print("Found it!")
            print(f"Desc: {matches[0][0]}")
            print(f"Prompt: {matches[0][1]}")
        else:
            # Let's try matching the other way
            matches2 = re.findall(r'prompt:"([^"]+)".*?id:"modern-dark"', content)
            if matches2:
                print("Found it backwards!")
                print(f"Prompt: {matches2[0]}")
            else:
                print("Looking for all prompt fields")
                prompts = re.findall(r'prompt:"([^"]+)"', content)
                for p in prompts:
                    if "dark" in p.lower():
                        print(f"Maybe this one: {p[:100]}...")
except Exception as e:
    print(f"Error: {e}")
