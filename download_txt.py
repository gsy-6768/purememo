import requests, json, os, sys, re

def download_txt(url, outpath):
    """Download TXT format word list and convert to JSON"""
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    
    lines = resp.text.strip().split('\n')
    words = []
    seen = set()
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Parse: word\tmeaning
        parts = line.split('\t', 1)
        if len(parts) < 2:
            # Try tab or space separation
            parts = line.split(None, 1)
        if len(parts) < 2:
            continue
        
        word = parts[0].strip().lower()
        meaning = parts[1].strip()
        
        if not word or word in seen or not meaning:
            continue
        seen.add(word)
        
        # Extract part of speech from meaning if present
        pos = ''
        pos_match = re.match(r'^(v\.|n\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.|art\.|num\.|vi\.|vt\.|aux\.|modal)\s+', meaning)
        if pos_match:
            pos = pos_match.group(1)
        
        words.append({
            "word": word,
            "phonetic_uk": "",
            "phonetic_us": "",
            "pos": pos,
            "meaning": meaning,
            "example": ""
        })
    
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=1)
    
    print(f'  {os.path.basename(outpath)}: {len(words)} words')
    return len(words)

outdir = sys.argv[1]

print('Downloading CET4 (TXT)...')
url4 = 'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/3%20%E5%9B%9B%E7%BA%A7-%E4%B9%B1%E5%BA%8F.txt'
cnt4 = download_txt(url4, os.path.join(outdir, 'cet4.json'))

print('Downloading CET6 (TXT)...')
url6 = 'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/4%20%E5%85%AD%E7%BA%A7-%E4%B9%B1%E5%BA%8F.txt'
cnt6 = download_txt(url6, os.path.join(outdir, 'cet6.json'))

print(f'\nDone! CET4: {cnt4} words, CET6: {cnt6} words')
