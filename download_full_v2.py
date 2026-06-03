"""
下载 KyleBing 英语词汇完整版数据（带详细释义+例句+音标）
数据源: https://github.com/KyleBing/english-vocabulary
"""
import requests, json, sys, os, time

def parse_item(item):
    """解析一条完整的单词数据"""
    head = item.get('headWord', '')
    if not head:
        return None
    
    word = head.strip().lower()
    content = item.get('content', {}).get('word', {}).get('content', {})
    if not content:
        return None
    
    # 音标
    usphone = content.get('usphone', '')
    ukphone = content.get('ukphone', '')
    
    # 翻译（合并所有词性和释义）
    trans_list = content.get('trans', [])
    pos_parts = []
    meaning_lines = []
    
    for t in trans_list:
        pos = t.get('pos', '')
        tran_cn = t.get('tranCn', '')
        if pos and tran_cn:
            pos_parts.append(pos)
            meaning_lines.append(f"{pos}. {tran_cn}")
    
    # 如果 trans 为空，尝试从 syno 提取释义
    if not meaning_lines:
        synos = content.get('syno', {}).get('synos', [])
        for s in synos:
            pos = s.get('pos', '')
            tran = s.get('tran', '')
            if pos and tran:
                pos_parts.append(pos)
                meaning_lines.append(f"{pos}. {tran}")
    
    # 词性合并（去重）
    pos_str = '/'.join(sorted(set(pos_parts))) if pos_parts else ''
    meaning_str = '；'.join(meaning_lines) if meaning_lines else ''
    
    # 例句（取第一个非真题例句）
    example = ''
    sentences = content.get('sentence', {}).get('sentences', [])
    if sentences:
        s = sentences[0]
        en = s.get('sContent', '')
        cn = s.get('sCn', '')
        if en:
            example = f"{en} — {cn}"
    
    return {
        "word": word,
        "phonetic_uk": ukphone,
        "phonetic_us": usphone,
        "pos": pos_str + '.' if pos_str and not pos_str.endswith('.') else pos_str,
        "meaning": meaning_str,
        "example": example
    }

def download_full(source_id, outpath):
    """下载全部部件并合并"""
    parts = []
    i = 1
    while True:
        url = f'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json_original/json-full/{source_id}_{i}.json'
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            break
        data = resp.json()
        parts.extend(data)
        print(f'  Downloaded {source_id}_{i}.json: {len(data)} items')
        i += 1
        time.sleep(0.5)
    
    if not parts:
        print(f'  No files found for {source_id}')
        return 0
    
    # 解析
    merged = []
    seen = set()
    for item in parts:
        parsed = parse_item(item)
        if parsed and parsed['word'] not in seen:
            seen.add(parsed['word'])
            merged.append(parsed)
    
    # 写入
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=1)
    
    with_meaning = sum(1 for w in merged if w['meaning'])
    with_example = sum(1 for w in merged if w['example'])
    with_phone = sum(1 for w in merged if w['phonetic_us'] or w['phonetic_uk'])
    print(f'  -> {os.path.basename(outpath)}: {len(merged)} words')
    print(f'     有释义: {with_meaning}, 有例句: {with_example}, 有音标: {with_phone}')
    return len(merged)

if __name__ == '__main__':
    outdir = sys.argv[1] if len(sys.argv) > 1 else 'src/data'
    print('Downloading CET4 full data...')
    cnt4 = download_full('CET4', os.path.join(outdir, 'cet4.json'))
    print('Downloading CET6 full data...')
    cnt6 = download_full('CET6', os.path.join(outdir, 'cet6.json'))
    print(f'\nDone! CET4: {cnt4}, CET6: {cnt6}')
