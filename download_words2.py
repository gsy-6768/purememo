import json, requests, os, sys

def download_json(url, outpath):
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    
    converted = []
    keys_seen = set()
    empty_keys = 0
    for item in data:
        word = item.get("name", item.get("word", "")).strip().lower()
        if not word or word in keys_seen:
            continue
        keys_seen.add(word)
        
        translation = item.get("translation", "") or ""
        phonetic = item.get("phonetic", "") or ""
        
        w = {
            "word": word,
            "phonetic_uk": phonetic,
            "phonetic_us": phonetic,
            "pos": "",
            "meaning": translation.replace("；", "; ").strip(),
            "example": ""
        }
        if not translation:
            empty_keys += 1
        converted.append(w)
    
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(converted, f, ensure_ascii=False, indent=1)
    
    print(f"{os.path.basename(outpath)}: {len(converted)} words ({empty_keys} without translation) -> {outpath}")
    return len(converted)

base = 'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json'
cnt4 = download_json(f'{base}/3-CET4-顺序.json', os.path.join(sys.argv[1], 'cet4.json'))
cnt6 = download_json(f'{base}/4-CET6-顺序.json', os.path.join(sys.argv[1], 'cet6.json'))
print(f'Done! CET4: {cnt4}, CET6: {cnt6}')
