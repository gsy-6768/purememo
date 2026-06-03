"""
从 enrich_words.py 提取词根数据库 + 扫描 cet4/cet6.json 建立单词映射
输出: src/data/roots.json
"""
import json, sys, os, re

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 读取 enrich_words.py 中的 ROOT_DB
root_db = {}
with open("enrich_words.py", "r", encoding="utf-8") as f:
    content = f.read()

# Extract ROOT_DB dict
match = re.search(r'ROOT_DB\s*=\s*\{', content)
if match:
    start = match.start()
    # Find matching closing brace
    depth = 0
    pos = start
    while pos < len(content):
        if content[pos] == '{': depth += 1
        elif content[pos] == '}': 
            depth -= 1
            if depth == 0:
                end = pos + 1
                break
        pos += 1
    root_dict_str = content[start:end]
    try:
        root_db = eval(root_dict_str, {"__builtins__": {}}, {})
    except:
        print("Warning: Could not eval ROOT_DB, trying alternative...")
        # Fall back to importing from enrich_words
        sys.path.insert(0, ".")
        # Can't import directly due to dependencies, use simpler approach

# Also extract MNEMONICS
mnemonics = {}
match = re.search(r'MNEMONICS\s*=\s*\{', content)
if match:
    start = match.start()
    depth = 0
    pos = start
    while pos < len(content):
        if content[pos] == '{': depth += 1
        elif content[pos] == '}':
            depth -= 1
            if depth == 0:
                end = pos + 1
                break
        pos += 1
    mnemonic_str = content[start:end]
    try:
        mnemonics = eval(mnemonic_str, {"__builtins__": {}}, {})
    except:
        pass

print(f"Found {len(root_db)} roots, {len(mnemonics)} mnemonics")

# 如果 root_db 为空，用硬编码的根做后备
if not root_db:
    # Define commonly known roots manually
    print("Using fallback root list")
    root_db = {
        "rupt": {"root": "rupt", "origin": "拉丁语 rumpere (打破)", "meaning": "打破，断裂"},
        "dict": {"root": "dict", "origin": "拉丁语 dicere (说)", "meaning": "说，宣告"},
        "port": {"root": "port", "origin": "拉丁语 portare (搬运)", "meaning": "搬运，携带"},
        "spect": {"root": "spect", "origin": "拉丁语 specere (看)", "meaning": "看，观察"},
        "struct": {"root": "struct", "origin": "拉丁语 struere (建造)", "meaning": "建造"},
        "tract": {"root": "tract", "origin": "拉丁语 trahere (拉)", "meaning": "拉，拖"},
        "duct": {"root": "duct/duc", "origin": "拉丁语 ducere (引导)", "meaning": "引导"},
        "mit": {"root": "mit/miss", "origin": "拉丁语 mittere (发送)", "meaning": "发送"},
        "pel": {"root": "pel/puls", "origin": "拉丁语 pellere (推动)", "meaning": "推动"},
        "vid": {"root": "vid/vis", "origin": "拉丁语 videre (看)", "meaning": "看见"},
        "aud": {"root": "aud", "origin": "拉丁语 audire (听)", "meaning": "听"},
        "cred": {"root": "cred", "origin": "拉丁语 credere (相信)", "meaning": "相信"},
        "scrib": {"root": "scrib/script", "origin": "拉丁语 scribere (写)", "meaning": "写"},
        "pos": {"root": "pos/pon", "origin": "拉丁语 ponere (放置)", "meaning": "放置"},
        "fer": {"root": "fer", "origin": "拉丁语 ferre (携带)", "meaning": "携带，带来"},
        "ject": {"root": "ject", "origin": "拉丁语 jacere (投掷)", "meaning": "投掷"},
        "press": {"root": "press", "origin": "拉丁语 premere (压)", "meaning": "压"},
        "ven": {"root": "ven/vent", "origin": "拉丁语 venire (来)", "meaning": "来"},
        "ceed": {"root": "ceed/cede/cess", "origin": "拉丁语 cedere (走/让步)", "meaning": "走，让步"},
        "bio": {"root": "bio", "origin": "希腊语 bios (生命)", "meaning": "生命"},
        "geo": {"root": "geo", "origin": "希腊语 ge (地球)", "meaning": "地球"},
        "graph": {"root": "graph", "origin": "希腊语 graphein (写)", "meaning": "写，画"},
        "phon": {"root": "phon", "origin": "希腊语 phone (声音)", "meaning": "声音"},
        "logy": {"root": "logy", "origin": "希腊语 logos (学科)", "meaning": "学科"},
        "tele": {"root": "tele", "origin": "希腊语 tele (远)", "meaning": "远的"},
        "micro": {"root": "micro", "origin": "希腊语 mikros (小)", "meaning": "小的"},
        "macro": {"root": "macro", "origin": "希腊语 makros (大)", "meaning": "大的"},
        "poly": {"root": "poly", "origin": "希腊语 polys (多)", "meaning": "多的"},
        "mono": {"root": "mono", "origin": "希腊语 monos (单一)", "meaning": "单一的"},
    }

# 提取相关单词（反向映射）—— 遍历 cet4 和 cet6，检查每个词是否在 ROOT_DB 中有匹配
# 由于数据量大，只检查词根是否出现在单词中
word_root_map = {}

def find_matching_roots(word, root_db):
    """Find which roots match a given word"""
    w_lower = word.lower()
    matched = []
    for root_key, root_info in root_db.items():
        root_name = root_info.get("root", root_key).split("/")[0]
        if len(root_name) >= 3 and root_name in w_lower:
            # Avoid matching suffixes/prefixes that are too short
            matched.append(root_key)
        # Also check the key directly
        if len(root_key) >= 3 and root_key != root_name and root_key in w_lower:
            if root_key not in matched:
                matched.append(root_key)
    return matched

for fname in ["cet4", "cet6"]:
    path = f"src/data/{fname}.json"
    if not os.path.exists(path):
        print(f"Warning: {path} not found")
        continue
    with open(path, "r", encoding="utf-8") as f:
        words = json.load(f)
    for w in words:
        word = w["word"]
        matched = find_matching_roots(word, root_db)
        if matched:
            word_root_map[word] = matched

print(f"Mapped {len(word_root_map)} words to roots")

# 反向：每个词根下有哪些单词
root_words = {}
for word, roots in word_root_map.items():
    for r in roots:
        if r not in root_words:
            root_words[r] = []
        root_words[r].append(word)

# 构建输出
output = {
    "meta": {
        "totalRoots": len(root_db),
        "totalMappedWords": len(word_root_map),
        "source": "enrich_words.py + CET-4/6 word lists"
    },
    "roots": {},
    "wordIndex": word_root_map,
    "rootWords": {k: v[:50] for k, v in root_words.items()}  # cap at 50 per root
}

for key, info in root_db.items():
    output["roots"][key] = {
        "root": info.get("root", key),
        "origin": info.get("origin", ""),
        "meaning": info.get("meaning", ""),
        "related": info.get("related", [])[:20],
        "wordCount": len(root_words.get(key, [])),
    }

out_path = "src/data/roots.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=1)

print(f"Output: {out_path}")
print(f"Roots: {len(output['roots'])}")
print(f"Mapped words: {len(output['wordIndex'])}")
