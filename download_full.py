import requests, json, os, sys

def download_full_words(source_id, outpath):
    """
    Download and merge the 'full' JSON files for a word list.
    Format: {"name":"word","t":"translation","p":"phonetic","s":"sentence","p1":"pos"}
    """
    parts = []
    i = 1
    while True:
        url = f'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json_original/json-full/{source_id}_{i}.json'
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            break
        data = resp.json()
        parts.append(data)
        print(f'  Downloaded {source_id}_{i}.json: {len(data)} items')
        i += 1
    
    if not parts:
        print(f'  No files found for {source_id}')
        return 0
    
    # Merge
    merged = []
    seen = set()
    for part in parts:
        for item in part:
            word = item.get("name", "").strip().lower()
            if not word or word in seen:
                continue
            seen.add(word)
            merged.append({
                "word": word,
                "phonetic_uk": item.get("p", "") or "",
                "phonetic_us": item.get("p", "") or "",
                "pos": item.get("p1", "") or "",
                "meaning": (item.get("t", "") or "").replace("；", "; ").strip(),
                "example": (item.get("s", "") or "").strip()
            })
    
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=1)
    
    meaningful = sum(1 for w in merged if w['meaning'])
    print(f'  Total: {len(merged)} words ({meaningful} with translations) -> {os.path.basename(outpath)}')
    return len(merged)

outdir = sys.argv[1]
print('Downloading CET4 full data...')
cnt4 = download_full_words('CET4', os.path.join(outdir, 'cet4.json'))
print('Downloading CET6 full data...')
cnt6 = download_full_words('CET6', os.path.join(outdir, 'cet6.json'))
print(f'\nDone! CET4: {cnt4}, CET6: {cnt6}')
