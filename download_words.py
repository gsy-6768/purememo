import json, urllib.request, os, sys

def download_json(url, outpath):
    """Download JSON with proper encoding handling"""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        data = json.load(r)
    
    # Convert to our app's format
    converted = []
    for item in data:
        w = {
            "word": item.get("name", item.get("word", "")),
            "phonetic_uk": "",
            "phonetic_us": "",
            "pos": "",
            "meaning": item.get("translation", "").replace("；", "; "),
            "example": ""
        }
        # Extract phonetic if available
        phonetic = item.get("phonetic", "")
        if phonetic:
            w["phonetic_uk"] = phonetic
            w["phonetic_us"] = phonetic
        converted.append(w)
    
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(converted, f, ensure_ascii=False, indent=1)
    
    print(f"{os.path.basename(outpath)}: {len(converted)} words -> {outpath}")
    return len(converted)

# Download CET4
url4 = 'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/3-CET4-%E9%A1%BA%E5%BA%8F.json'
cnt4 = download_json(url4, os.path.join(sys.argv[1], 'cet4.json'))

# Download CET6
url6 = 'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/4-CET6-%E9%A1%BA%E5%BA%8F.json'
cnt6 = download_json(url6, os.path.join(sys.argv[1], 'cet6.json'))

print(f'Done! CET4: {cnt4} words, CET6: {cnt6} words')
