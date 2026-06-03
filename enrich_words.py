"""
PureMemo 词库丰富脚本
======================
读取 cet4.json / cet6.json，为每个单词增加：
  - collocations: 常考搭配
  - root: 词根词缀拆解 + 同根词
  - mnemonic: 助记口诀
  - synonyms / antonyms: 近/反义词
  - extraExamples: 更多例句
  - frequencyTier: 词频分级 (core/common/advanced)

数据来源:
  1. FreeDictionaryAPI (api.dictionaryapi.dev) — 定义/例句/同反义
  2. Datamuse API — 近义词/关联词
  3. 内置拉丁/希腊词根库
  4. 启发式规则 — 频次分级

用法:
  python enrich_words.py                    # 处理所有词库
  python enrich_words.py --max 50           # 仅处理前50个（测试）
  python enrich_words.py --resume           # 从中断处继续
"""

import json
import urllib.request
import urllib.error
import time
import os
import sys
import re
from pathlib import Path
import concurrent.futures
import threading

# ============================================================
# 1. 词根词缀数据库
# ============================================================

ROOT_DB = {
    # Latin roots
    "rupt": {"root": "rupt", "origin": "拉丁语 rumpere (打破)", "meaning": "打破，断裂",
             "related": ["disrupt", "corrupt", "erupt", "interrupt", "rupture"]},
    "dict": {"root": "dict", "origin": "拉丁语 dicere (说)", "meaning": "说，宣告",
             "related": ["predict", "dictate", "contradict", "verdict", "dictator"]},
    "port": {"root": "port", "origin": "拉丁语 portare (搬运)", "meaning": "搬运，携带",
             "related": ["transport", "export", "import", "report", "portable", "porter"]},
    "scrib": {"root": "scrib/script", "origin": "拉丁语 scribere (写)", "meaning": "写",
              "related": ["describe", "prescribe", "subscribe", "transcribe", "manuscript"]},
    "script": {"root": "scrib/script", "origin": "拉丁语 scribere (写)", "meaning": "写",
               "related": ["describe", "prescribe", "subscribe", "transcribe", "manuscript"]},
    "spect": {"root": "spect", "origin": "拉丁语 specere (看)", "meaning": "看，观察",
              "related": ["inspect", "respect", "suspect", "prospect", "spectacle", "retrospect"]},
    "struct": {"root": "struct", "origin": "拉丁语 struere (建造)", "meaning": "建造",
               "related": ["construct", "destroy", "instruct", "structure", "obstruct"]},
    "tract": {"root": "tract", "origin": "拉丁语 trahere (拉)", "meaning": "拉，拖",
              "related": ["attract", "extract", "subtract", "contract", "tractor", "abstract"]},
    "duct": {"root": "duct/duc", "origin": "拉丁语 ducere (引导)", "meaning": "引导",
             "related": ["conduct", "introduce", "produce", "reduce", "deduce", "induce"]},
    "duc": {"root": "duct/duc", "origin": "拉丁语 ducere (引导)", "meaning": "引导",
            "related": ["conduct", "introduce", "produce", "reduce", "deduce", "induce"]},
    "mit": {"root": "mit/miss", "origin": "拉丁语 mittere (发送)", "meaning": "发送，投掷",
            "related": ["admit", "commit", "permit", "transmit", "submit", "emit"]},
    "miss": {"root": "mit/miss", "origin": "拉丁语 mittere (发送)", "meaning": "发送，投掷",
             "related": ["admit", "commit", "permit", "transmit", "submit", "emit"]},
    "pel": {"root": "pel/puls", "origin": "拉丁语 pellere (推)", "meaning": "推动，驱使",
            "related": ["compel", "expel", "propel", "repel", "impulse"]},
    "puls": {"root": "pel/puls", "origin": "拉丁语 pellere (推)", "meaning": "推动，驱使",
             "related": ["compel", "expel", "propel", "repel", "impulse"]},
    "vid": {"root": "vid/vis", "origin": "拉丁语 videre (看)", "meaning": "看，看见",
            "related": ["evident", "vision", "invisible", "revise", "supervise", "provide"]},
    "vis": {"root": "vid/vis", "origin": "拉丁语 videre (看)", "meaning": "看，看见",
            "related": ["evident", "vision", "invisible", "revise", "supervise", "provide"]},
    "aud": {"root": "aud", "origin": "拉丁语 audire (听)", "meaning": "听",
            "related": ["audio", "audience", "audit", "auditorium", "audible"]},
    "cred": {"root": "cred", "origin": "拉丁语 credere (相信)", "meaning": "相信，信任",
             "related": ["credit", "credible", "incredible", "credential", "creed"]},
    "flect": {"root": "flect/flex", "origin": "拉丁语 flectere (弯曲)", "meaning": "弯曲",
              "related": ["reflect", "flexible", "deflect", "inflection"]},
    "flex": {"root": "flect/flex", "origin": "拉丁语 flectere (弯曲)", "meaning": "弯曲",
             "related": ["reflect", "flexible", "deflect", "inflection"]},
    "pend": {"root": "pend/pens", "origin": "拉丁语 pendere (悬挂/支付)", "meaning": "悬挂，支付",
             "related": ["depend", "suspend", "independent", "pending", "expense"]},
    "pens": {"root": "pend/pens", "origin": "拉丁语 pendere (悬挂/支付)", "meaning": "悬挂，支付",
             "related": ["depend", "suspend", "independent", "pending", "expense"]},
    "ceed": {"root": "ceed/cede/cess", "origin": "拉丁语 cedere (走，让与)", "meaning": "走，前进",
             "related": ["proceed", "succeed", "exceed", "recede", "access"]},
    "cede": {"root": "ceed/cede/cess", "origin": "拉丁语 cedere (走，让与)", "meaning": "走，前进",
             "related": ["proceed", "succeed", "exceed", "recede", "access"]},
    "cess": {"root": "ceed/cede/cess", "origin": "拉丁语 cedere (走，让与)", "meaning": "走，前进",
             "related": ["proceed", "succeed", "exceed", "recede", "access"]},
    "gress": {"root": "gress/grad", "origin": "拉丁语 gradi (行走)", "meaning": "行走，步骤",
              "related": ["progress", "aggressive", "congress", "gradual", "graduate"]},
    "grad": {"root": "gress/grad", "origin": "拉丁语 gradi (行走)", "meaning": "行走，步骤",
             "related": ["progress", "aggressive", "congress", "gradual", "graduate"]},
    "ject": {"root": "ject", "origin": "拉丁语 jacere (投掷)", "meaning": "投掷，抛",
             "related": ["reject", "inject", "project", "subject", "object", "trajectory"]},
    "lect": {"root": "lect/leg", "origin": "拉丁语 legere (选择/读)", "meaning": "选择，收集，读",
             "related": ["select", "collect", "elect", "intellect", "neglect"]},
    "leg": {"root": "lect/leg", "origin": "拉丁语 legere (选择/读)", "meaning": "选择，收集，读",
            "related": ["select", "collect", "elect", "intellect", "neglect"]},
    "pos": {"root": "pos/pon", "origin": "拉丁语 ponere (放置)", "meaning": "放置",
            "related": ["compose", "expose", "impose", "propose", "oppose", "position"]},
    "pon": {"root": "pos/pon", "origin": "拉丁语 ponere (放置)", "meaning": "放置",
            "related": ["compose", "expose", "impose", "propose", "oppose", "position"]},
    "sens": {"root": "sens/sent", "origin": "拉丁语 sentire (感觉)", "meaning": "感觉，感知",
             "related": ["sense", "sensitive", "consent", "dissent", "resent"]},
    "sent": {"root": "sens/sent", "origin": "拉丁语 sentire (感觉)", "meaning": "感觉，感知",
             "related": ["sense", "sensitive", "consent", "dissent", "resent"]},
    "terr": {"root": "terr", "origin": "拉丁语 terra (土地)", "meaning": "土地，地球",
             "related": ["territory", "terrain", "terrestrial", "extraterrestrial"]},
    "vac": {"root": "vac/van", "origin": "拉丁语 vacare (空)", "meaning": "空，空白",
            "related": ["vacant", "vacation", "vacuum", "vanish", "empty"]},
    "van": {"root": "vac/van", "origin": "拉丁语 vacare (空)", "meaning": "空，空白",
            "related": ["vacant", "vacation", "vacuum", "vanish", "empty"]},
    "val": {"root": "val", "origin": "拉丁语 valere (强壮的)", "meaning": "价值，强壮",
            "related": ["value", "valid", "evaluate", "equivalent", "prevail"]},
    "volv": {"root": "volv/volu", "origin": "拉丁语 volvere (转)", "meaning": "转，卷",
             "related": ["evolve", "revolve", "involve", "volume", "revolution"]},
    "volu": {"root": "volv/volu", "origin": "拉丁语 volvere (转)", "meaning": "转，卷",
             "related": ["evolve", "revolve", "involve", "volume", "revolution"]},

    # Greek roots
    "bio": {"root": "bio", "origin": "希腊语 bios (生命)", "meaning": "生命，生物",
            "related": ["biology", "antibiotic", "biography", "biochemistry", "biopsy"]},
    "geo": {"root": "geo", "origin": "希腊语 ge (地球)", "meaning": "地球，土地",
            "related": ["geography", "geology", "geometry", "geopolitics"]},
    "tele": {"root": "tele", "origin": "希腊语 tele (远)", "meaning": "远距离",
             "related": ["telephone", "television", "telescope", "telegram", "telepathy"]},
    "micro": {"root": "micro", "origin": "希腊语 mikros (小)", "meaning": "微，小",
              "related": ["microscope", "microbe", "microwave", "microphone"]},
    "macro": {"root": "macro", "origin": "希腊语 makros (大)", "meaning": "大，宏观",
              "related": ["macroeconomics", "macroscopic", "macromolecule"]},
    "graph": {"root": "graph/gram", "origin": "希腊语 graphein (写)", "meaning": "写，画，记录",
              "related": ["autograph", "photograph", "paragraph", "biography", "geography"]},
    "gram": {"root": "graph/gram", "origin": "希腊语 graphein (写)", "meaning": "写，画，记录",
             "related": ["autograph", "photograph", "paragraph", "biography", "geography"]},
    "phon": {"root": "phon", "origin": "希腊语 phone (声音)", "meaning": "声音",
             "related": ["telephone", "symphony", "microphone", "phonetic", "stereo"]},
    "logy": {"root": "logy", "origin": "希腊语 logos (学科)", "meaning": "…学，…论",
             "related": ["biology", "psychology", "technology", "sociology", "ecology"]},
    "poly": {"root": "poly", "origin": "希腊语 polys (多)", "meaning": "多，众",
             "related": ["polygon", "polytechnic", "polygamy", "polytheism"]},
    "mono": {"root": "mono", "origin": "希腊语 monos (单一)", "meaning": "单一，一个",
             "related": ["monologue", "monopoly", "monochrome", "monotone"]},
    "anti": {"root": "anti", "origin": "希腊语 anti (相反)", "meaning": "反对，相反",
             "related": ["antibiotic", "antifreeze", "antithesis", "antisocial"]},
    "auto": {"root": "auto", "origin": "希腊语 autos (自己)", "meaning": "自己，自动",
             "related": ["automatic", "automobile", "autograph", "autonomy"]},
    "demo": {"root": "demo", "origin": "希腊语 demos (人民)", "meaning": "人民",
             "related": ["democracy", "demographic", "epidemic"]},
    "chron": {"root": "chron", "origin": "希腊语 chronos (时间)", "meaning": "时间",
              "related": ["chronic", "chronicle", "chronology", "synchronize"]},
    "path": {"root": "path", "origin": "希腊语 pathos (感情/疾病)", "meaning": "感情，疾病，疗法",
             "related": ["sympathy", "apathy", "empathy", "pathology", "psychopath"]},
    "psych": {"root": "psych", "origin": "希腊语 psyche (心灵)", "meaning": "心灵，心理",
              "related": ["psychology", "psychiatry", "psychic", "psychopath"]},
    "therm": {"root": "therm", "origin": "希腊语 therme (热)", "meaning": "热",
              "related": ["thermal", "thermometer", "thermostat", "hypothermia"]},
    "scope": {"root": "scope", "origin": "希腊语 skopein (看)", "meaning": "观察，观察仪器",
              "related": ["microscope", "telescope", "periscope", "stethoscope"]},
    "hydr": {"root": "hydr", "origin": "希腊语 hydor (水)", "meaning": "水",
             "related": ["hydrogen", "hydraulic", "dehydrate", "hydrant"]},

    # Common prefixes
    "un": {"root": "un", "origin": "古英语 (否定前缀)", "meaning": "不，未（否定）",
           "related": ["unable", "unlike", "unnecessary", "unprecedented"]},
    "re": {"root": "re", "origin": "拉丁语 (前缀)", "meaning": "再，重新，向后",
           "related": ["return", "review", "renew", "rebuild", "react"]},
    "pre": {"root": "pre", "origin": "拉丁语 prae (在前)", "meaning": "在…之前，预先",
            "related": ["predict", "prevent", "prepare", "preview", "previous"]},
    "post": {"root": "post", "origin": "拉丁语 post (在后)", "meaning": "在…之后",
             "related": ["postpone", "postwar", "postgraduate", "postscript"]},
    "inter": {"root": "inter", "origin": "拉丁语 inter (之间)", "meaning": "在…之间，相互",
              "related": ["international", "interact", "interview", "interfere"]},
    "trans": {"root": "trans", "origin": "拉丁语 trans (横穿)", "meaning": "横穿，跨越，转变",
              "related": ["transport", "transfer", "translate", "transform", "transparent"]},
    "sub": {"root": "sub", "origin": "拉丁语 sub (在下)", "meaning": "在…下，次，亚",
            "related": ["submit", "subway", "submarine", "substance", "substitute"]},
    "super": {"root": "super", "origin": "拉丁语 super (在上)", "meaning": "超，上，过度",
              "related": ["superior", "supermarket", "supervise", "superficial"]},
    "dis": {"root": "dis", "origin": "拉丁语 (否定/分离)", "meaning": "不，否定，分离",
            "related": ["disagree", "disappear", "discover", "disorder", "distract"]},
    "co": {"root": "co/com/con", "origin": "拉丁语 cum (共同)", "meaning": "共同，一起",
           "related": ["cooperate", "coexist", "coordinate", "coauthor"]},
    "com": {"root": "co/com/con", "origin": "拉丁语 cum (共同)", "meaning": "共同，一起",
            "related": ["combine", "company", "communicate", "community"]},
    "con": {"root": "co/com/con", "origin": "拉丁语 cum (共同)", "meaning": "共同，一起",
            "related": ["connect", "contain", "confirm", "concentrate", "conclude"]},
    "ex": {"root": "ex", "origin": "拉丁语 ex (向外)", "meaning": "向外，出，前任",
           "related": ["export", "exclude", "expand", "extract", "ex-wife"]},
    "in": {"root": "in/im", "origin": "拉丁语 in (向内/否定)", "meaning": "向内；不",
           "related": ["include", "inside", "invisible", "incorrect", "independent"]},
    "im": {"root": "in/im", "origin": "拉丁语 in (向内/否定)", "meaning": "向内；不",
           "related": ["import", "impossible", "immature", "imperfect"]},
    "pro": {"root": "pro", "origin": "拉丁语 pro (向前/赞成)", "meaning": "向前，赞成，公开",
            "related": ["progress", "promote", "propose", "proclaim", "pro-active"]},
    "a": {"root": "a/an", "origin": "拉丁/希腊语 (否定前缀)", "meaning": "不，无，非",
          "related": ["amoral", "asymmetry", "apathy", "anhydrous"]},
    "an": {"root": "a/an", "origin": "拉丁/希腊语 (否定前缀)", "meaning": "不，无，非",
           "related": ["amoral", "asymmetry", "apathy", "anhydrous"]},
    "de": {"root": "de", "origin": "拉丁语 de (向下/去除)", "meaning": "向下，去除，否定",
           "related": ["decline", "decrease", "delete", "depart", "destroy"]},
    "en": {"root": "en/em", "origin": "拉丁语 (使动前缀)", "meaning": "使…，进入",
           "related": ["enable", "encourage", "enjoy", "enlarge", "empower"]},
    "em": {"root": "en/em", "origin": "拉丁语 (使动前缀)", "meaning": "使…，进入",
           "related": ["enable", "encourage", "enjoy", "enlarge", "empower"]},
    "over": {"root": "over", "origin": "古英语 (前缀)", "meaning": "过度，在…上",
             "related": ["overcome", "overflow", "overlook", "overwhelm"]},
    "mis": {"root": "mis", "origin": "古英语 (前缀)", "meaning": "错误，坏",
            "related": ["mistake", "misunderstand", "mislead", "mischief"]},
    "fore": {"root": "fore", "origin": "古英语 (前缀)", "meaning": "前，预先",
             "related": ["forecast", "foresee", "forehead", "foreground"]},
    "out": {"root": "out", "origin": "古英语 (前缀)", "meaning": "超过，在外",
            "related": ["outline", "outlook", "output", "outstanding", "outweigh"]},
    "up": {"root": "up", "origin": "古英语 (前缀)", "meaning": "向上",
           "related": ["update", "upgrade", "uphold", "uproar"]},

    # Common suffixes
    "tion": {"root": "tion/sion", "origin": "拉丁语 (名词后缀)", "meaning": "行为/状态/结果",
             "related": []},
    "sion": {"root": "tion/sion", "origin": "拉丁语 (名词后缀)", "meaning": "行为/状态/结果",
             "related": []},
    "ment": {"root": "ment", "origin": "拉丁语 (名词后缀)", "meaning": "行为/结果/手段",
             "related": []},
    "ness": {"root": "ness", "origin": "古英语 (名词后缀)", "meaning": "性质/状态",
             "related": []},
    "ity": {"root": "ity/ty", "origin": "拉丁语 (名词后缀)", "meaning": "性质/状态",
            "related": []},
    "ty": {"root": "ity/ty", "origin": "拉丁语 (名词后缀)", "meaning": "性质/状态",
           "related": []},
    "able": {"root": "able/ible", "origin": "拉丁语 (形容词后缀)", "meaning": "可…的，能…的",
             "related": []},
    "ible": {"root": "able/ible", "origin": "拉丁语 (形容词后缀)", "meaning": "可…的，能…的",
             "related": []},
    "ful": {"root": "ful", "origin": "古英语 (形容词后缀)", "meaning": "充满…的",
            "related": []},
    "less": {"root": "less", "origin": "古英语 (形容词后缀)", "meaning": "没有…的",
             "related": []},
    "ous": {"root": "ous", "origin": "拉丁语 (形容词后缀)", "meaning": "具有…性质的",
            "related": []},
    "ive": {"root": "ive", "origin": "拉丁语 (形容词后缀)", "meaning": "有…倾向的",
            "related": []},
    "al": {"root": "al", "origin": "拉丁语 (形容词/名词后缀)", "meaning": "…的",
           "related": []},
    "ize": {"root": "ize/ise", "origin": "希腊语 (动词后缀)", "meaning": "使…化",
            "related": []},
    "ise": {"root": "ize/ise", "origin": "希腊语 (动词后缀)", "meaning": "使…化",
            "related": []},
    "ate": {"root": "ate", "origin": "拉丁语 (动词后缀)", "meaning": "使…，做…",
            "related": []},
    "ify": {"root": "ify", "origin": "拉丁语 (动词后缀)", "meaning": "使…化",
            "related": []},
    "ist": {"root": "ist", "origin": "希腊语 (人后缀)", "meaning": "…主义者/…家",
            "related": []},
    "ism": {"root": "ism", "origin": "希腊语 (主义后缀)", "meaning": "…主义/…学说",
            "related": []},
    "logy": {"root": "logy", "origin": "希腊语 (学科后缀)", "meaning": "…学",
             "related": []},
    # Additional important roots
    "ven": {"root": "ven/vent", "origin": "拉丁语 venire (来)", "meaning": "来，到达",
            "related": ["adventure", "event", "prevent", "invent", "convenient"]},
    "vent": {"root": "ven/vent", "origin": "拉丁语 venire (来)", "meaning": "来，到达",
             "related": ["adventure", "event", "prevent", "invent", "convenient"]},
    "fer": {"root": "fer", "origin": "拉丁语 ferre (携带/带来)", "meaning": "携带，带来",
            "related": ["transfer", "refer", "conference", "differ", "offer", "prefer"]},
    "voc": {"root": "voc/vok", "origin": "拉丁语 vocare (叫喊)", "meaning": "声音，叫喊",
            "related": ["vocal", "advocate", "provoke", "evoke", "vocabulary"]},
    "vok": {"root": "voc/vok", "origin": "拉丁语 vocare (叫喊)", "meaning": "声音，叫喊",
            "related": ["vocal", "advocate", "provoke", "evoke", "vocabulary"]},
    "vert": {"root": "vert/vers", "origin": "拉丁语 vertere (转)", "meaning": "转动，转变",
             "related": ["convert", "reverse", "diverse", "anniversary", "advertise"]},
    "vers": {"root": "vert/vers", "origin": "拉丁语 vertere (转)", "meaning": "转动，转变",
             "related": ["convert", "reverse", "diverse", "anniversary", "advertise"]},
    "curr": {"root": "curr/curs", "origin": "拉丁语 currere (跑)", "meaning": "跑，流动",
             "related": ["current", "occur", "curriculum", "currency", "excursion"]},
    "curs": {"root": "curr/curs", "origin": "拉丁语 currere (跑)", "meaning": "跑，流动",
             "related": ["current", "occur", "curriculum", "currency", "excursion"]},
    "sent": {"root": "sens/sent", "origin": "拉丁语 sentire (感觉)", "meaning": "感觉，情感",
             "related": ["sentence", "sentiment", "dissent", "consent", "resent"]},
    "cogn": {"root": "cogn", "origin": "拉丁语 cognoscere (知道)", "meaning": "知道，认识",
             "related": ["recognize", "cognitive", "cognition", "incognito"]},
    "nov": {"root": "nov", "origin": "拉丁语 novus (新的)", "meaning": "新的",
            "related": ["novel", "innovate", "renovate", "novice", "innovation"]},
    "press": {"root": "press", "origin": "拉丁语 premere (压)", "meaning": "压，挤压",
              "related": ["express", "impress", "depress", "compress", "suppress"]},
}


# Hard-coded mnemonics for common words
MNEMONICS = {
    "abruptly": "ab(加强) + rupt(打破) + ly → 突然打破 → 突然地",
    "absorb": "ab(加强) + sorbere(吸收) → 吸收",
    "abuse": "ab(偏离) + use(用) → 用歪了 → 滥用",
    "academic": " academ(学院) + ic(…的) → 学术的",
    "access": "ac(向) + cess(走) → 走过去 → 接近/通道",
    "accident": "ac(向) + cid(落下) + ent → 突然落下的东西 → 事故",
    "achieve": "a(向) + chief(头/结束) → 到头了 → 达到/获得",
    "acquire": "ac(加强) + quire(寻求) → 努力寻求 → 获得",
    "adapt": "ad(向) + apt(适合) → 使适合 → 适应",
    "adequate": "ad(向) + equ(相等) + ate → 与所需相等 → 足够的",
    "admit": "ad(向) + mit(发送) → 发送过去 → 准许进入/承认",
    "adopt": "ad(向) + opt(选择) → 选择接受 → 采纳/收养",
    "advance": "ad(向) + van(前) + ce → 走向前 → 前进/进步",
    "adventure": "ad(向) + vent(来) + ure → 来到未知 → 冒险",
    "advise": "ad(向) + vis(看) + e → 看过来 → 建议/劝告",
    "affect": "af(向) + fect(做) → 对…做 → 影响",
    "afford": "af(向) + ford(向前) → 向前提供 → 负担得起",
    "aggressive": "ag(向) + gress(走) + ive → 不断走向 → 侵略的/好斗的",
    "agree": "a(向) + gree(喜好) → 同喜→ 同意",
    "allow": "al(向) + low(赞扬) → 赞扬通过 → 允许",
    "although": "al(全部) + though(虽然) → 尽管",
    "amount": "a(向) + mount(山) → 累积成山 → 数量",
    "announce": "an(向) + nounce(报告) → 向…报告 → 宣布",
    "annual": "ann(年) + ual → 每年的",
    "anxiety": "an(在) + xiety(分离) → 内心分离 → 焦虑",
    "apparent": "ap(向) + par(显现) + ent → 显现出来的 → 明显的",
    "appeal": "ap(向) + peal(推动) → 推动过去 → 呼吁/吸引",
    "appear": "ap(向) + pear(显现) → 显现出来 → 出现",
    "apply": "ap(向) + ply(折叠) → 折过去 → 申请/应用",
    "approach": "ap(向) + proach(接近) → 接近 → 靠近/方法",
    "appropriate": "ap(向) + propri(自己的) + ate → 使成为自己的一→ 适当的/拨给",
    "approve": "ap(向) + prove(证明) → 证明可行 → 批准",
    "arrange": "ar(向) + range(排列) → 排列好 → 安排",
    "arrive": "ar(向) + rive(河岸) → 到河岸 → 到达",
    "aspect": "a(向) + spect(看) → 看过去的方向 → 方面/外表",
    "assess": "as(向) + sess(坐) → 坐在旁边评估 → 评估",
    "assign": "as(向) + sign(标记) → 在…上做标记 → 分配/指派",
    "assist": "as(向) + sist(站) → 站在一旁 → 协助",
    "associate": "as(向) + soci(同伴) + ate → 使成为同伴 → 关联/同事",
    "assume": "as(向) + sume(拿取) → 拿来 → 假设/承担",
    "attach": "at(向) + tach(钉) → 钉上去 → 附上/连接",
    "attempt": "at(向) + tempt(尝试) → 去尝试 → 企图",
    "attend": "at(向) + tend(伸展) → 伸展过去 → 参加/照料",
    "attitude": "at(向) + titude(倾向) → 倾向 → 态度",
    "attract": "at(向) + tract(拉) → 拉过来 → 吸引",
    "authority": "auth(创造) + ority → 创造者 → 权威/当局",
    "available": "a(向) + vail(价值) + able → 有价值的 → 可用的",
    "average": "来自阿拉伯语 awariyah(损坏的货物) → 平均数",
    "avoid": "a(向) + void(空) → 使空 → 避免",
    "balance": "bi(两) + lance(盘子) → 两个盘子平衡 → 平衡",
    "barrier": "bar(横木) + rier → 横木阻挡 → 障碍",
    "battery": "batt(打) + ery → 连续打 → 电池/殴打",
    "behave": "be(使) + have(拥有) → 使拥有某种方式 → 表现",
    "belief": "be(使) + lief(喜爱) → 被喜爱 → 相信/信念",
    "benefit": "bene(好) + fit(做) → 做好事 → 利益/益处",
    "biology": "bio(生命) + logy(学) → 生物学",
    "boundary": "bound(边界) + ary → 边界",
    "capable": "cap(拿取) + able(能) → 能拿下的 → 有能力的",
    "capacity": "cap(拿取) + acity → 能拿多少 → 容量/能力",
    "capture": "cap(拿取) + ture → 拿住 → 捕获/夺取",
    "career": "car(车) + eer → 车行走的轨迹 → 生涯/职业",
    "category": "cate(在下面) + gory(说) → 在下面分说 → 类别",
    "celebrate": "celebr(众多) + ate → 很多人聚集 → 庆祝",
    "challenge": "chall(诽谤) + enge → 挑衅 → 挑战",
    "character": "charact(雕刻) + er → 雕刻出来的东西 → 特征/人物/字符",
    "circumstance": "circum(周围) + st(站) + ance → 站在周围的东西 → 环境/情况",
    "civilize": "civ(公民) + ilize → 使成为公民 → 教化/文明",
    "claim": "clam(喊叫) → 大喊 → 声称/要求",
    "classify": "class(类别) + ify(使) → 使成为类别 → 分类",
    "climate": "clim(倾斜) + ate → 太阳倾斜的角度 → 气候",
    "collapse": "col(共同) + laps(滑) + e → 一起滑倒 → 倒塌/崩溃",
    "colleague": "col(共同) + league(捆绑) → 绑在一起工作 → 同事",
    "collect": "col(共同) + lect(选择) → 选到一起 → 收集",
    "college": "col(共同) + leg(选择) → 共同选择 → 学院",
    "combine": "com(共同) + bine(两个) → 两个合在一起 → 结合",
    "commit": "com(共同) + mit(发送) → 共同发出 → 犯(罪)/承诺",
    "communicate": "com(共同) + mun(服务) + icate → 共同服务 → 交流/传播",
    "community": "com(共同) + mun(服务) + ity → 共同服务的人群 → 社区",
    "company": "com(共同) + pan(面包) + y → 一起吃面包 → 公司/陪伴",
    "compare": "com(共同) + par(平等) + e → 放在一起看是否平等 → 比较",
    "compete": "com(共同) + pet(追求) + e → 共同追求 → 竞争",
    "complain": "com(共同) + plain(捶胸) → 一起捶胸 → 抱怨",
    "complete": "com(共同) + ple(填满) + te → 全部填满 → 完成/完整的",
    "complex": "com(共同) + plex(编织) → 编织在一起 → 复杂的",
    "complicate": "com(共同) + plic(折叠) + ate → 叠在一起 → 使复杂",
    "compose": "com(共同) + pos(放置) + e → 放在一起 → 组成/作曲",
    "comprehension": "com(共同) + prehend(抓住) + sion → 一起抓住含义 → 理解",
    "compute": "com(共同) + put(思考) + e → 放在一起思考 → 计算",
    "concentrate": "con(共同) + centr(中心) + ate → 集中在中心 → 集中/浓缩",
    "concept": "con(共同) + cept(拿取) → 共同拿取的观念 → 概念",
    "concern": "con(共同) + cern(筛) → 筛过放在一起 → 关心/涉及",
    "conclude": "con(共同) + clude(关闭) → 一起关闭 → 结束/下结论",
    "condition": "con(共同) + dit(说) + ion → 共同说好的 → 条件/状况",
    "conduct": "con(共同) + duct(引导) → 引导到一起 → 行为/指挥",
    "conference": "con(共同) + fer(带走) + ence → 带到一起 → 会议",
    "confident": "con(共同) + fid(相信) + ent → 完全相信 → 自信的",
    "confirm": "con(共同) + firm(坚固) → 使坚固 → 证实/确认",
    "conflict": "con(共同) + flict(打) → 对打 → 冲突",
    "connect": "con(共同) + nect(捆绑) → 绑在一起 → 连接",
    "conscience": "con(共同) + sci(知道) + ence → 共同知道 → 良心",
    "conscious": "con(共同) + sci(知道) + ous → 知道的 → 有意识的",
    "consequence": "con(共同) + sequ(跟随) + ence → 跟随而来的 → 结果/后果",
    "conserve": "con(共同) + serv(保持) + e → 保持好 → 保存/节约",
    "consider": "con(共同) + sider(星星) → 观察星象 → 考虑",
    "consistent": "con(共同) + sist(站) + ent → 站在一起 → 一致的/持续的",
    "constant": "con(共同) + st(站) + ant → 一直站着 → 不变的/持续的",
    "constitute": "con(共同) + stit(放置) + ute → 放在一起 → 构成/设立",
    "construct": "con(共同) + struct(建造) → 建造起来 → 建设/构建",
    "consume": "con(共同) + sume(拿取) → 全部拿走 → 消耗/消费",
    "contact": "con(共同) + tact(接触) → 互相接触 → 联系",
    "contain": "con(共同) + tain(持有) → 持有 → 包含/容纳",
    "contemporary": "con(共同) + tempor(时间) + ary → 同一时代的 → 当代的",
    "contend": "con(共同) + tend(伸展) → 一起伸展争夺 → 竞争/主张",
    "contest": "con(共同) + test(证明) → 一起证明谁更好 → 竞赛",
    "continue": "con(共同) + tin(保持) + ue → 保持下去 → 继续",
    "contract": "con(共同) + tract(拉) → 拉到一起 → 合同/收缩",
    "contradict": "contra(相反) + dict(说) → 说相反的话 → 矛盾/反驳",
    "contrary": "contra(相反) + ry → 相反的",
    "contribute": "con(共同) + tribute(给予) → 给予 → 贡献/捐献",
    "controversy": "contro(相反) + vers(转) + y → 转向相反 → 争论",
    "convenient": "con(共同) + ven(来) + ient → 都来到一起 → 方便的",
    "convention": "con(共同) + vent(来) + ion → 来到一起 → 会议/惯例",
    "convince": "con(共同) + vince(征服) → 彻底征服 → 说服",
    "cooperate": "co(共同) + oper(工作) + ate → 一起工作 → 合作",
    "coordinate": "co(共同) + ordin(顺序) + ate → 使顺序一致 → 协调",
    "corporate": "co(共同) + orpor(身体) + ate → 组成一个整体 → 公司的/共同的",
    "correct": "cor(加强) + rect(直) → 使直 → 正确的/纠正",
    "correspond": "cor(共同) + respond(回答) → 共同回答 → 对应/通信",
    "counsel": "coun(一起) + sel(拿取) → 一起拿意见 → 商议/建议",
    "create": "cre(成长) + ate → 使成长 → 创造",
    "creature": "cre(成长) + ature → 被创造出来的 → 生物",
    "crisis": "cris(筛/判) + is → 需要判断的时刻 → 危机",
    "criteria": "cri(判) + teria → 判断的标准 → 标准(复数)",
    "critical": "crit(判) + ical → 判断的 → 批评的/关键的",
    "cultivate": "cult(耕种) + iv + ate → 耕种 → 培养/耕作",
    "culture": "cult(耕种) + ure → 耕种的结果 → 文化/培养",
    "curious": "cur(关心) + ious → 关心的 → 好奇的",
    "current": "cur(跑) + ent → 正在跑的 → 当前的/水流/电流",
    "debate": "de(向下) + bat(打) + e → 打下去 → 辩论",
    "deceive": "de(离开) + ceive(拿取) → 拿偏离 → 欺骗",
    "declare": "de(加强) + clar(清楚) + e → 说清楚 → 宣布/声明",
    "decline": "de(向下) + clin(倾斜) + e → 向下倾斜 → 下降/拒绝",
    "decorate": "decor(美丽) + ate → 使美丽 → 装饰",
    "decrease": "de(向下) + cre(生长) + ase → 向下生长 → 减少",
    "defeat": "de(否定) + feat(做) → 做不好 → 打败/失败",
    "defend": "de(离开) + fend(打击) → 打击离开 → 防御/辩护",
    "define": "de(向下) + fin(界限) + e → 画下界限 → 定义",
    "definite": "de(向下) + fin(界限) + ite → 有界限的 → 明确的",
    "degree": "de(向下) + gree(步骤) → 一步一步向下 → 程度/度数/学位",
    "delay": "de(离开) + lay(放置) → 放一边 → 延误/推迟",
    "delegate": "de(离开) + leg(派遣) + ate → 派出去 → 委派/代表",
    "deliberate": "de(加强) + liber(称量) + ate → 仔细称量 → 故意的/深思熟虑的",
    "delicate": "de(加强) + lic(诱惑) + ate → 非常诱人的 → 精致的/微妙的",
    "deliver": "de(离开) + liver(自由) → 给予自由 → 交付/递送/接生",
    "demand": "de(加强) + mand(命令) → 强硬命令 → 要求/需求",
    "democracy": "demo(人民) + cracy(统治) → 人民的统治 → 民主",
    "demonstrate": "de(加强) + monstr(展示) + ate → 展示出来 → 演示/证明/示威",
    "depart": "de(离开) + part(部分) → 离开一部分 → 离开/出发",
    "depend": "de(向下) + pend(悬挂) → 挂在…下 → 依赖/取决于",
    "deposit": "de(向下) + pos(放置) + it → 放下 → 存放/押金/沉淀",
    "depress": "de(向下) + press(压) → 向下压 → 使沮丧/压抑",
    "derive": "de(离开) + riv(河流) + e → 从河流引出 → 源于/派生",
    "describe": "de(向下) + scrib(写) + e → 写下来 → 描述",
    "deserve": "de(加强) + serv(服务) + e → 应得服务 → 值得",
    "design": "de(向下) + sign(标记) → 做标记 → 设计/图案",
    "desire": "de(加强) + sir(星星) + e → 渴望星星 → 渴望/欲望",
    "desperate": "de(否定) + sper(希望) + ate → 没有希望的 → 绝望的/拼命的",
    "despite": "de(向下) + spite(看) → 向下看 → 尽管/不管",
    "destiny": "de(加强) + stin(站) + y → 站着不动的 → 命运",
    "destroy": "de(去除) + struct(建造) → 建造的东西被去除 → 摧毁",
    "detail": "de(向下) + tail(切割) → 切细 → 细节/详情",
    "detect": "de(去除) + tect(掩盖) → 去除掩盖 → 发现/侦察",
    "determine": "de(加强) + term(边界) + ine → 划清边界 → 决定/确定",
    "develop": "de(去掉) + velop(包) → 去掉包裹 → 发展/开发",
    "device": "de(加强) + vice(看) → 看清楚 → 设备/装置/策略",
    "devote": "de(加强) + vote(发誓) → 发誓 → 奉献/致力于",
    "dictate": "dict(说) + ate → 说出来 → 口述/命令",
    "differ": "dif(分开) + fer(带走) → 带走分开 → 不同/相异",
    "difficult": "dif(否定) + fic(做) + ult → 不好做 → 困难的",
    "digest": "di(分开) + gest(运送) → 分开运送 → 消化/摘要",
    "dignity": "dign(值得) + ity → 值得尊敬 → 尊严",
    "dilemma": "di(两个) + lemma(假设) → 两个假设 → 两难困境",
    "dimension": "di(穿过) + mens(测量) + ion → 测穿 → 尺寸/维度",
    "diminish": "di(加强) + min(小) + ish → 使变小 → 减少/降低",
    "diploma": "di(双) + ploma(折叠) → 折叠的纸 → 文凭/证书",
    "direct": "di(穿过) + rect(直) → 笔直穿过 → 直接的/指导",
    "disappear": "dis(否定) + appear(出现) → 不出现 → 消失",
    "disaster": "dis(否定) + aster(星星) → 星位不好 → 灾难",
    "discipline": "disciple(弟子) + ine → 弟子的规矩 → 纪律/学科",
    "discourage": "dis(否定) + courage(勇气) → 失去勇气 → 使气馁",
    "discover": "dis(否定) + cover(覆盖) → 揭开覆盖 → 发现",
    "discriminate": "dis(分开) + crim(区分) + in + ate → 区分开 → 歧视/辨别",
    "discuss": "dis(分开) + cuss(打击) → 打散分析 → 讨论",
    "disgust": "dis(否定) + gust(味道) → 味道不好 → 厌恶",
    "dismiss": "dis(离开) + miss(发送) → 发送离开 → 解散/解雇",
    "display": "dis(分开) + play(折叠) → 展开折叠 → 展示/显示",
    "dispose": "dis(分开) + pos(放置) + e → 分开放置 → 处理/处置",
    "dispute": "dis(分开) + put(思考) + e → 思考不同 → 争论/争端",
    "distance": "di(分开) + st(站) + ance → 分开站立 → 距离",
    "distinct": "di(分开) + stinct(刺) → 刺出区别 → 明显的/不同的",
    "distinguish": "di(分开) + sting(刺) + uish → 刺出区别 → 区分/使杰出",
    "distract": "dis(离开) + tract(拉) → 拉开 → 分心/转移",
    "distribute": "dis(分开) + tribute(给予) → 分开给予 → 分配/分发",
    "disturb": "dis(分开) + turb(搅动) → 搅乱 → 打扰/扰乱",
    "diverse": "di(分开) + vers(转) + e → 转向不同方向 → 多样的",
    "divorce": "di(分开) + vorce(转) → 转开 → 离婚/分离",
    "document": "doc(教) + ument → 教学用的 → 文件/文档",
    "domestic": "dom(家) + estic → 家里的 → 国内的/家庭的",
    "dominate": "dom(统治) + in + ate → 统治 → 支配/主宰",
    "donate": "don(给予) + ate → 给出去 → 捐赠",
    "doubt": "dub(二) + t → 两种想法 → 怀疑",
    "dramatic": "drama(戏剧) + tic → 戏剧的 → 戏剧性的/巨大的",
    "durable": "dur(持续) + able(能) → 能持续的 → 耐久的",
    "dynamic": "dynam(力量) + ic → 有力量的 → 动态的/有活力的",
    "economy": "eco(家) + nomy(管理) → 管理家务 → 经济/节约",
    "educate": "e(向外) + duc(引导) + ate → 引导出去 → 教育",
    "effect": "ef(向外) + fect(做) → 做出来的结果 → 效果/影响",
    "efficient": "ef(向外) + fic(做) + ient → 能做出来的 → 高效的",
    "effort": "ef(向外) + fort(力量) → 使出力量 → 努力",
    "elaborate": "e(加强) + labor(做) + ate → 努力做 → 精心制作的/阐述",
    "elect": "e(向外) + lect(选择) → 选出来 → 选举/选择",
    "element": "ele(基础) + ment → 基础的东西 → 元素/要素",
    "eliminate": "e(向外) + limin(门槛) + ate → 扔出门槛 → 消除/淘汰",
    "embrace": "em(向内) + brace(手臂) → 纳入手臂 → 拥抱/包含",
    "emerge": "e(向外) + merg(浸入) + e → 从浸入中出来 → 浮现/出现",
    "emotion": "e(向外) + mot(移动) + ion → 移动出来的 → 情感",
    "emphasis": "em(在内) + phas(显示) + is → 显示在里面 → 强调/重点",
    "employ": "em(在内) + ploy(折叠) → 纳入其中 → 雇佣/使用",
    "enable": "en(使) + able(能) → 使能 → 使能够",
    "encounter": "en(在内) + counter(相对) → 在相对中 → 遭遇/遇到",
    "encourage": "en(使) + courage(勇气) → 给予勇气 → 鼓励",
    "enforce": "en(使) + force(力量) → 使有力量 → 强制执行/实施",
    "engage": "en(使) + gage(承诺) → 使承诺 → 从事/吸引/订婚",
    "engine": "engen(产生) + ine → 产生动力的 → 发动机/引擎",
    "enormous": "e(向外) + norm(标准) + ous → 超出标准的 → 巨大的",
    "ensure": "en(使) + sure(确定) → 使确定 → 确保",
    "enterprise": "enter(之间) + prise(拿取) → 在中间拿取 → 企业/事业",
    "entertain": "enter(之间) + tain(持有) → 保持在其中 → 娱乐/招待",
    "enthusiasm": "en(在内) + thus(神) + iasm → 神在心中 → 热情",
    "environment": "en(在内) + viron(转) + ment → 围绕在周围 → 环境",
    "epidemic": "epi(在…上) + dem(人民) + ic → 在人民之上的 → 流行病/流行的",
    "episode": "epi(在…上) + sode(进入) → 进入的一段 → 插曲/一集",
    "equality": "equ(相等的) + ality → 相等 → 平等",
    "equivalent": "equi(相等) + val(价值) + ent → 价值相等的 → 等价的/等量",
    "erupt": "e(向外) + rupt(打破) → 打破而出 → 喷发/爆发",
    "especially": "e(加强) + special(特殊) + ly → 特别地 → 尤其是",
    "essential": "ess(存在) + ential → 存在的根本 → 本质的/必要的",
    "establish": "e(加强) + stabl(站立) + ish → 使站立稳固 → 建立/确立",
    "estimate": "estim(价值) + ate → 评估价值 → 估计/评价",
    "evaluate": "e(向外) + val(价值) + uate → 得出价值 → 评估",
    "evaporate": "e(向外) + vapor(蒸汽) + ate → 变成蒸汽出来 → 蒸发/消失",
    "evidence": "e(向外) + vid(看) + ence → 看出来的 → 证据/迹象",
    "evident": "e(向外) + vid(看) + ent → 看得出来的 → 明显的",
    "evolve": "e(向外) + volv(转) + e → 转出来 → 进化/演变",
    "exact": "ex(向外) + act(做) → 做出来的 → 精确的/确切的",
    "exaggerate": "ex(向外) + agger(堆积) + ate → 堆积过多 → 夸张",
    "examine": "ex(向外) + amin(称量) + e → 称量出来 → 检查/考试",
    "exceed": "ex(超出) + ceed(走) → 走出界限 → 超过",
    "excellent": "ex(向外) + cell(升起) + ent → 升出来的 → 卓越的/极好的",
    "except": "ex(向外) + cept(拿取) → 拿出去 → 除了/除外",
    "excessive": "ex(向外) + cess(走) + ive → 走出去的 → 过度的/极端的",
    "exchange": "ex(向外) + change(变化) → 换出去 → 交换/兑换",
    "excite": "ex(向外) + cite(叫) → 叫出来 → 使兴奋/激发",
    "exclude": "ex(向外) + clude(关闭) → 关在外面 → 排除/排斥",
    "excuse": "ex(向外) + cuse(理由) → 给出理由 → 原谅/借口",
    "execute": "ex(向外) + (s)ecut(跟随) + e → 跟出去 → 执行/处决",
    "exercise": "ex(向外) + erc(限制) + ise → 解除限制 → 练习/运动",
    "exhaust": "ex(向外) + haust(抽) → 抽空 → 耗尽/筋疲力尽",
    "exhibit": "ex(向外) + hib(持有) + it → 拿出去展示 → 展览/展示",
    "existence": "ex(向外) + sist(站) + ence → 站出来 → 存在",
    "expand": "ex(向外) + pand(伸展) → 伸展出去 → 扩张/膨胀",
    "expect": "ex(向外) + spect(看) → 向外看 → 期望/预期",
    "expense": "ex(向外) + pens(悬挂/支付) + e → 支付出去 → 花费/费用",
    "experience": "ex(向外) + per(尝试) + ience → 尝试出来的 → 经验/经历",
    "experiment": "ex(向外) + per(尝试) + ment → 尝试 → 实验",
    "expert": "ex(向外) + per(尝试) + t → 尝试出来的 → 专家/专业的",
    "explain": "ex(向外) + plain(平的) → 使平坦易懂 → 解释/说明",
    "explicit": "ex(向外) + plic(折叠) + it → 向外折叠 → 明确的/清楚的",
    "exploit": "ex(向外) + ploit(折叠) → 折叠向外 → 开发/利用/剥削",
    "explore": "ex(向外) + plor(哭喊) + e → 喊叫着探索 → 探索/探险",
    "explosion": "ex(向外) + plod(爆发) + sion → 爆出去 → 爆炸/剧增",
    "export": "ex(向外) + port(搬运) → 搬出去 → 出口",
    "expose": "ex(向外) + pos(放置) + e → 放在外面 → 暴露/揭露",
    "express": "ex(向外) + press(压) → 压出来 → 表达/快速的",
    "extend": "ex(向外) + tend(伸展) → 伸展出去 → 延伸/扩展",
    "extent": "ex(向外) + tent(伸展) → 伸展的程度 → 范围/程度",
    "external": "ex(向外) + tern(外部) + al → 外部的",
    "extraordinary": "extra(超出) + ordinary(普通) → 超出普通的 → 非凡的",
    "extreme": "ex(向外) + trem(颤抖) + e → 颤抖到极限 → 极端的/极度的",
    "facility": "fac(做) + ility → 做事的工具 → 设施/便利/天赋",
    "factor": "fact(做) + or → 做事的因素 → 因素/要素",
    "faculty": "fac(做) + ulty → 做事的能力 → 才能/全体教员",
    "familiar": "fam(家庭) + iliar → 像一家人 → 熟悉的",
    "fashion": "fash(做) + ion → 做出来的样式 → 时尚/流行/方式",
    "fatal": "fat(命运) + al → 命运的 → 致命的/重大的",
    "feasible": "feas(做) + ible(能) → 能做的 → 可行的",
    "feature": "feat(做) + ure → 做出来的东西 → 特征/特点/容貌",
    "federal": "feder(联盟) + al → 联盟的 → 联邦的",
    "fiction": "fic(做) + tion → 做出来的故事 → 小说/虚构",
    "finance": "fin(结束) + ance → 结账 → 金融/财务",
    "flexible": "flex(弯曲) + ible(能) → 能弯曲的 → 灵活的/柔韧的",
    "fluent": "flu(流动) + ent → 流动的 → 流畅的/流利的",
    "forecast": "fore(前) + cast(投掷) → 提前投掷 → 预测/预报",
    "fortune": "fort(运气) + une → 运气 → 财富/命运",
    "foundation": "found(基础) + ation → 打基础 → 地基/基础/基金会",
    "fragment": "frag(打破) + ment → 打破的结果 → 碎片/片段",
    "frequent": "frequ(众多) + ent → 众多的 → 频繁的",
    "friction": "frict(摩擦) + ion → 摩擦/冲突",
    "frustrate": "frustr(徒劳) + ate → 徒劳 → 使沮丧/阻挠",
    "function": "func(执行) + tion → 执行的功能 → 功能/函数/运行",
    "fundamental": "fund(基础) + amental → 基础性的 → 基本的/根本的",
    "furthermore": "further(更远的) + more(更多) → 更进一步说 → 此外/而且",
    "generate": "gener(产生) + ate → 产生 → 产生/生成",
    "generous": "gener(产生) + ous → 不断产生 → 慷慨的/大量的",
    "genetic": "gen(基因) + etic → 基因的 → 遗传的/基因的",
    "genius": "gen(生) + ius → 天生 → 天才",
    "geography": "geo(地球) + graph(写) + y → 描写地球 → 地理学",
    "global": "globe(球) + al → 全球的/全面的",
    "gradual": "grad(步) + ual → 一步一步的 → 逐渐的",
    "graduate": "grad(步) + uate → 走出一步 → 毕业/研究生",
    "guarantee": "guar(保卫) + antee → 保卫 → 保证/担保",
    "guilty": "guilt(罪) + y → 有罪的/内疚的",
    "harmony": "harmon(连接) + y → 连接在一起 → 和谐/协调",
    "hesitate": "hesit(黏着) + ate → 黏着不动 → 犹豫/迟疑",
    "horizon": "horiz(界限) + on → 界限 → 地平线/视野",
    "hospitality": "hospit(客人) + ality → 对待客人 → 好客/款待",
    "humanity": "human(人) + ity → 人性/人类/人道",
    "identify": "ident(相同) + ify(使) → 使相同 → 识别/确认/认同",
    "ignore": "i(不) + gnor(知道) + e → 不知道 → 忽视/忽略",
    "illustrate": "il(向内) + lustr(照亮) + ate → 照亮 → 说明/阐明/图解",
    "imagination": "imag(想象) + ination → 想象力/想象",
    "immediate": "im(不) + medi(中间) + ate → 没有中间的 → 立即的/直接的",
    "immigrate": "im(向内) + migr(迁移) + ate → 迁入 → 移民(入境)",
    "immune": "im(不) + mun(服务) + e → 不需要服务 → 免疫的/免除的",
    "impact": "im(向内) + pact(撞击) → 撞击进去 → 影响/冲击",
    "implement": "im(向内) + ple(填满) + ment → 填满 → 实施/工具",
    "implication": "im(向内) + plic(折叠) + ation → 折叠在里面 → 含义/暗示/影响",
    "imply": "im(向内) + ply(折叠) → 折叠在里面 → 暗示/意味着",
    "import": "im(向内) + port(搬运) → 搬进来 → 进口/重要性",
    "impose": "im(向内) + pos(放置) + e → 强加进去 → 强加/征收",
    "impress": "im(向内) + press(压) → 压进去 → 给…深刻印象/压印",
    "improve": "im(使) + prove(有利) → 使有利 → 改进/提高",
    "impulse": "im(向内) + puls(推) + e → 推动 → 冲动/冲击",
    "incident": "in(向内) + cid(落下) + ent → 落进来的事 → 事件/事故",
    "incline": "in(向) + clin(倾斜) + e → 倾斜 → 倾向/斜坡",
    "include": "in(向内) + clude(关闭) → 关在里面 → 包括/包含",
    "income": "in(向内) + come(来) → 进来的 → 收入",
    "incorporate": "in(向内) + corpor(身体) + ate → 使其成为身体一部分 → 合并/纳入",
    "increase": "in(向内) + cre(生长) + ase → 不断生长 → 增加/增长",
    "incredible": "in(不) + cred(相信) + ible → 不可相信的 → 难以置信的",
    "indicate": "in(向内) + dic(说) + ate → 说出 → 表明/指示/暗示",
    "individual": "in(不) + divid(分割) + ual → 不可分割的 → 个人/个体/单独的",
    "induce": "in(向内) + duc(引导) + e → 引入 → 诱导/说服/引起",
    "industry": "indu(内部) + stry(站立) → 站立的 → 工业/勤勉",
    "inevitable": "in(不) + evit(避免) + able → 不可避免的",
    "infant": "in(不) + fant(说) → 不会说话的 → 婴儿/幼儿",
    "inferior": "infer(下面) + ior → 下面的 → 低等的/次等的/下属",
    "infinite": "in(不) + fin(结束) + ite → 没有结束的 → 无限的",
    "influence": "in(向内) + flu(流) + ence → 流入 → 影响/感化",
    "inform": "in(向内) + form(形式) → 形成 → 通知/告知",
    "ingredient": "in(向内) + gred(走) + ient → 走进去的东西 → 成分/原料",
    "inhabit": "in(向内) + habit(居住) → 住在里面 → 居住于",
    "inherit": "in(向内) + her(继承) + it → 继承 → 继承/遗传",
    "initial": "in(向内) + it(走) + ial → 走进的第一步 → 开始的/最初的/首字母",
    "initiate": "in(向内) + it(走) + iate → 带进来 → 开始/发起/接纳",
    "inject": "in(向内) + ject(投掷) → 投进去 → 注射/注入",
    "injure": "in(不) + jur(法律) + e → 不合法律 → 伤害/损害",
    "innocent": "in(不) + noc(伤害) + ent → 不伤害的 → 无辜的/天真的",
    "innovate": "in(向内) + nov(新) + ate → 引入新的 → 创新/革新",
    "inquire": "in(向内) + quire(寻求) → 往里寻求 → 询问/调查",
    "insect": "in(向内) + sect(切割) → 切割成段 → 昆虫",
    "insert": "in(向内) + sert(加入) → 加入进去 → 插入/嵌入",
    "inspect": "in(向内) + spect(看) → 看进去 → 检查/审视",
    "inspire": "in(向内) + spir(呼吸) + e → 吹入气息 → 激励/启发",
    "install": "in(向内) + stall(放置) → 放进去 → 安装/就职",
    "instance": "in(向内) + st(站) + ance → 站在里面的 → 实例/例子",
    "instant": "in(向内) + st(站) + ant → 站进来的 → 立刻的/紧急的/瞬间",
    "instinct": "in(向内) + stinct(刺) → 内在的推动 → 本能/直觉",
    "institute": "in(向内) + stit(放置) + ute → 建立 → 学院/研究所/设立",
    "instruct": "in(向内) + struct(建造) → 在内心建造 → 指导/教育/指令",
    "instrument": "in(向内) + stru(建造) + ment → 用来建造的 → 工具/乐器/手段",
    "insult": "in(向内) + sult(跳) → 跳进来攻击 → 侮辱/辱骂",
    "insurance": "in(使) + sur(确定) + ance → 使确定 → 保险/保障",
    "integrate": "in(不) + tegr(触摸) + ate → 未被触摸 → 整合/融入",
    "intellectual": "intel(之间) + lect(选择) + ual → 能在中间选择的 → 智力/知识分子",
    "intelligence": "intel(之间) + lig(选择) + ence → 选择的能力 → 智力/情报/智能",
    "intend": "in(向内) + tend(伸展) → 内心伸展 → 打算/意图",
    "intense": "in(向内) + tens(伸展) + e → 内部紧张 → 强烈的/激烈的",
    "intention": "in(向内) + tent(伸展) + ion → 内心的伸展 → 意图/目的",
    "interact": "inter(相互) + act(行动) → 相互行动 → 互动/交流",
    "interest": "inter(在…间) + est(存在) → 存在于其中 → 兴趣/利益/利息",
    "interfere": "inter(在…间) + fer(打击) + e → 打入中间 → 干涉/干扰",
    "interior": "inter(内部) + ior → 内部的/室内",
    "internal": "inter(内部) + nal → 内部的/内在的",
    "interpret": "inter(相互) + pret(价格) → 在价格间沟通 → 解释/口译",
    "interrupt": "inter(在…间) + rupt(打破) → 打破中间 → 打断/中断",
    "interval": "inter(在…间) + val(墙) → 墙之间的 → 间隔/幕间休息",
    "intervene": "inter(在…间) + ven(来) + e → 来到中间 → 介入/干涉/干预",
    "intimate": "intim(内部) + ate → 内部的 → 亲密的/私密的/暗示",
    "introduce": "intro(向内) + duc(引导) + e → 领进来 → 介绍/引入/提出",
    "invade": "in(向内) + vad(走) + e → 走进来 → 入侵/侵犯",
    "invest": "in(向内) + vest(穿衣) → 穿上衣服 → 投资/投入",
    "investigate": "in(向内) + vestig(脚印) + ate → 跟踪脚印 → 调查/研究",
    "involve": "in(向内) + volv(转) + e → 转进去 → 包含/涉及/使参与",
    "irrigate": "ir(向内) + rig(水) + ate → 引水 → 灌溉",
    "isolate": "isol(岛屿) + ate → 使成孤岛 → 隔离/孤立",
    "issue": "is(向外) + sue(走) → 走出去 → 问题/发行/发表",
    "justify": "just(正义) + ify(使) → 使正义 → 证明…正当/辩护",
    "laboratory": "labor(劳动) + ory(地方) → 劳动的地方 → 实验室",
    "landscape": "land(土地) + scape(景色) → 景色 → 风景/景观",
    "launch": "来自拉丁语 lancea(长矛) → 投出长矛 → 发射/发动/推出",
    "liberal": "liber(自由) + al → 自由的/开明的/文科的",
    "liberate": "liber(自由) + ate → 使自由 → 解放/释放",
    "literacy": "liter(文字) + acy → 能读写 → 读写能力/文化素养",
    "literal": "liter(文字) + al → 文字的 → 字面的/逐字的",
    "literary": "liter(文字) + ary → 文字的 → 文学的",
    "literature": "liter(文字) + ature → 文字作品 → 文学/文献",
    "local": "loc(地方) + al → 地方的 → 当地的/局部的",
    "locate": "loc(地方) + ate → 确定地方 → 找到/坐落于",
    "logical": "log(语言/理性) + ical → 理性的 → 逻辑的",
    "maintain": "main(手) + tain(持有) → 拿在手里 → 维持/保持/保养",
    "majority": "major(较大的) + ity → 大多数/多数",
    "management": "man(手) + age + ment → 管到手 → 管理/经营",
    "manipulate": "mani(手) + pul(拉) + ate → 用手拉动 → 操纵/操作",
    "manufacture": "manu(手) + fact(做) + ure → 用手做 → 制造/生产",
    "margin": "marg(标记) + in → 标记的地方 → 边缘/余地/利润",
    "massive": "mass(大块) + ive → 大块的 → 巨大的/大量的",
    "material": "mater(物质) + ial → 物质的 → 材料/原料/物质的",
    "mature": "matur(成熟) + e → 成熟的/成人",
    "maximum": "max(大) + imum → 最大量 → 最大值/最大限度",
    "mechanism": "mechan(机器) + ism → 机器原理 → 机制/机理",
    "medial": "medi(中间) + al → 中间的/中等的",
    "medicine": "med(治疗) + icine → 治疗用的 → 医学/药",
    "medium": "medi(中间) + um → 中间的 → 媒介/中等的",
    "mental": "ment(心) + al → 心里的 → 精神的/智力的",
    "mention": "ment(心) + ion → 在心里 → 提及/说起",
    "merchant": "merc(贸易) + hant → 贸易的人 → 商人",
    "mere": "mere(纯的) → 仅仅的/只不过",
    "merely": "mere(仅仅) + ly → 仅仅/只不过",
    "merge": "merg(浸入) + e → 浸入一起 → 合并/融合",
    "merit": "mer(值得) + it → 值得 → 优点/功绩/值得",
    "migrate": "migr(迁移) + ate → 迁移/移居",
    "military": "milit(士兵) + ary → 士兵的 → 军事的/军队",
    "minimum": "min(小) + imum → 最小 → 最小值/最低限度",
    "minister": "min(小) + ister(人) → 小人(对君王自称) → 部长/牧师/公使",
    "minor": "min(小) + or → 较小的/次要的/未成年人",
    "minority": "minor(较小的) + ity → 少数/少数派/少数民族",
    "miracle": "mir(惊奇) + acle → 令人惊奇的事 → 奇迹",
    "miserable": "miser(可怜) + able → 可怜的 → 悲惨的/痛苦的",
    "mission": "miss(发送) + ion → 送出去的任务 → 使命/任务/使团",
    "modify": "mod(方式) + ify(使) → 使有方式 → 修改/调整",
    "monitor": "mon(警告) + itor → 警告的人 → 监视器/班长/监控",
    "monopoly": "mono(单一) + poly(卖) → 独家卖 → 垄断/独占",
    "moral": "mor(习俗) + al → 习俗的 → 道德的/寓意",
    "motive": "mot(移动) + ive → 推动的东西 → 动机/目的",
    "multiple": "mult(多) + iple → 多的 → 多样的/多重的/倍数",
    "mutual": "mut(变化) + ual → 互相变化的 → 相互的/共同的",
    "mystery": "myst(神秘) + ery → 神秘的事物 → 神秘/谜",
    "narrative": "nar(说) + rative → 说的 → 叙事的/故事",
    "narrow": "narr(窄) + ow → 狭窄的/变窄",
    "nation": "nat(出生) + ion → 出生地 → 国家/民族",
    "nature": "nat(出生) + ure → 生来就有的 → 自然/天性",
    "navigate": "nav(船) + ig(驱) + ate → 驾驶船只 → 导航/航行",
    "necessary": "ne(不) + cess(走) + ary → 不能走的 → 必要的/必需品",
    "negative": "neg(否定) + ative → 否定的/负面的/消极的",
    "neglect": "neg(不) + lect(选择) → 不选择 → 忽视/疏忽",
    "negotiate": "neg(不) + oti(空闲) + ate → 不空闲 → 谈判/协商",
    "nerve": "nerv(神经) + e → 神经/勇气",
    "network": "net(网) + work(工作) → 网络/关系网",
    "neutral": "ne(不) + utr(哪个) + al → 两个都不 → 中立的/中性的",
    "nominate": "nomin(名字) + ate → 提名/任命",
    "normal": "norm(标准) + al → 标准的 → 正常的/标准的",
    "notice": "not(知道) + ice → 使知道 → 注意/通知/告示",
    "notion": "not(知道) + ion → 知道的概念 → 概念/看法/意图",
    "novel": "nov(新) + el → 新奇的 → 小说/新奇的",
    "numerous": "numer(数目) + ous → 数目多的 → 众多的/大量的",
    "obey": "ob(向) + ey(听) → 听…的话 → 服从/听从",
    "object": "ob(向) + ject(投掷) → 扔向对面 → 物体/对象/反对",
    "obligation": "ob(向) + lig(捆绑) + ation → 绑住 → 义务/责任",
    "obtain": "ob(向) + tain(持有) → 抓住 → 获得/取得",
    "obvious": "ob(在) + vi(路) + ous → 在路上 → 明显的/显然的",
    "occasion": "oc(向) + cas(落下) + ion → 落下的时机 → 场合/时机/引起",
    "occupy": "oc(向) + cupy(拿取) → 拿过来 → 占据/占领/使忙碌",
    "occur": "oc(向) + cur(跑) + r → 跑出来 → 发生/出现/被想到",
    "offense": "of(向) + fens(打) + e → 打过去 → 冒犯/进攻/违法",
    "official": "off(做) + ice + ial → 做事的 → 官方的/官员/正式的",
    "operate": "oper(工作) + ate → 工作/操作/运行/动手术",
    "opinion": "opin(认为) + ion → 认为的结果 → 意见/看法/舆论",
    "opponent": "op(相反) + pon(放置) + ent → 站在对面的人 → 对手/反对者",
    "opportunity": "op(向) + port(港口) + unity → 朝向港口 → 机会/机遇",
    "oppose": "op(相反) + pos(放置) + e → 放在对面 → 反对/对抗",
    "oppress": "op(加强) + press(压) → 压迫/压制/压抑",
    "optimistic": "optim(最好) + istic → 最好的 → 乐观的",
    "option": "opt(选择) + ion → 选择/选项",
    "orbit": "orb(轨道) + it → 轨道/绕…运行",
    "organ": "organ(器官/工具) → 器官/机构/风琴",
    "orient": "ori(升起) + ent → 太阳升起的地方 → 东方/定向/定位",
    "origin": "ori(升起) + gin → 升起的地方 → 起源/出身",
    "outcome": "out(向外) + come(来) → 出来的结果 → 结果/结局/成果",
    "outline": "out(向外) + line(线) → 外面的线 → 轮廓/大纲/概述",
    "output": "out(向外) + put(放) → 放出来的 → 输出/产量",
    "overall": "over(全面) + all(所有) → 总的来说 → 总体的/全面的",
    "overcome": "over(超过) + come(来) → 过来超越 → 克服/战胜",
    "overlook": "over(在上) + look(看) → 从上往下看 → 忽视/俯瞰",
    "overseas": "over(越过) + sea(海) + s → 越过海的 → 海外的/国外的",
    "overtake": "over(越过) + take(拿) → 超过/追上/压倒",
    "overwhelm": "over(在上) + whelm(压倒) → 压倒/淹没/使不知所措",
    "parade": "par(准备) + ade → 准备展示 → 游行/阅兵/展示",
    "paragraph": "para(旁边) + graph(写) → 写在一旁的 → 段落",
    "parallel": "para(旁边) + llel(互相) → 并排 → 平行的/类似的/并行",
    "participate": "parti(部分) + cip(拿取) + ate → 拿取一部分 → 参与/参加",
    "particular": "part(部分) + icular → 具体的部分 → 特别的/特定的/详细的",
    "passion": "pass(感受) + ion → 强烈的感受 → 热情/激情/酷爱",
    "passive": "pass(感受) + ive → 被动感受的 → 被动的/消极的",
    "patience": "pati(忍受) + ence → 忍受的能力 → 耐心/忍耐",
    "pattern": "pat(父亲) + tern → 父亲的榜样 → 模式/图案/样品",
    "peculiar": "pecu(牛) + liar → 牛群(财产) → 特有的/奇怪的/独特的",
    "penalty": "poen(惩罚) + alty → 惩罚/处罚/点球",
    "penetrate": "pen(内部) + etr(进入) + ate → 进入内部 → 穿透/渗透/洞察",
    "perceive": "per(穿过) + ceive(拿取) → 完全获取 → 察觉/感知/理解",
    "percentage": "per(每) + cent(百) + age → 每百中的 → 百分比/比例",
    "perfect": "per(加强) + fect(做) → 做到底 → 完美的/完美的/完成",
    "perform": "per(加强) + form(形式) → 完成形式 → 表演/执行/履行",
    "permanent": "per(贯穿) + man(停留) + ent → 一直停留的 → 永久的/固定的",
    "permit": "per(穿过) + mit(发送) → 发送过去 → 允许/许可/许可证",
    "persist": "per(贯穿) + sist(站) → 一直站着 → 坚持/持续/固执",
    "personnel": "person(人) + nel → 全体人员/人事部门",
    "perspective": "per(穿过) + spect(看) + ive → 看穿 → 透视图/视角/观点",
    "persuade": "per(加强) + suad(劝说) + e → 全力劝说 → 说服/劝服",
    "phenomenon": "phen(显现) + omenon → 显现出来的 → 现象/非凡的人或事",
    "philosophy": "philo(爱) + soph(智慧) + y → 爱智慧 → 哲学/人生哲学",
    "physical": "phys(自然) + ical → 自然的 → 身体的/物理的/物质的",
    "pioneer": "pier(脚) + oneer → 用脚走的人 → 先驱/开拓者/先锋",
    "platform": "plat(平的) + form(形式) → 平坦的形式 → 平台/站台/纲领",
    "pleasure": "pleas(使高兴) + ure → 高兴的状态 → 快乐/愉快/乐事",
    "plentiful": "plent(满) + iful → 满满的 → 丰富的/充足的",
    "plenty": "plent(满) + y → 丰富/充足/大量",
    "policy": "polic(治理) + y → 治理的准则 → 政策/方针/保险单",
    "polish": "pol(光滑) + ish → 使光滑 → 磨光/润色/Polish(波兰的)",
    "polite": "polit(光滑) + e → 圆滑的 → 有礼貌的/文雅的",
    "politics": "polit(治理) + ics → 治理的学问 → 政治/政治学/政见",
    "pollute": "pollu(染) + te → 污染/玷污",
    "popular": "popul(人民) + ar → 人民的 → 流行的/受欢迎的/通俗的",
    "portion": "port(部分) + ion → 一部分/一份/命运",
    "portrait": "port(画) + trait(拉) → 画出来的 → 肖像/描写/画像",
    "position": "pos(放置) + ition → 放置的位置 → 位置/职位/立场/姿势",
    "positive": "pos(放置) + itive → 放置好的 → 积极的/肯定的/正面的",
    "possess": "pos(主人) + sess(坐) → 作为主人坐着 → 拥有/占有/支配",
    "potential": "pot(能力) + ential → 有能力的 → 潜在的/潜力/可能的",
    "poverty": "pover(贫穷) + ty → 贫穷/贫困/贫乏",
    "practical": "pract(做) + ical → 做的 → 实际的/实用的/可行的",
    "practice": "pract(做) + ice → 反复做 → 练习/实践/惯例",
    "precede": "pre(前) + cede(走) → 走在前面 → 先于/领先/在…之前",
    "precise": "pre(前) + cise(切) → 预先切好 → 精确的/准确的/严谨的",
    "predict": "pre(前) + dict(说) → 预先说 → 预测/预言/预报",
    "prefer": "pre(前) + fer(搬运) → 搬运到前面 → 更喜欢/偏好",
    "pregnant": "pre(前) + gnant(生) → 出生之前 → 怀孕的/充满的",
    "prejudice": "pre(前) + jud(判断) + ice → 预先判断 → 偏见/歧视/损害",
    "preliminary": "pre(前) + limin(门槛) + ary → 门槛之前的 → 初步的/预备的/预赛",
    "premier": "prem(第一) + ier → 第一的 → 首相/总理/首要的",
    "premium": "pre(前) + em(拿取) + ium → 提前拿取 → 保费/额外费用/优质的",
    "preoccupy": "pre(前) + occupy(占据) → 先占据 → 使全神贯注/使关注",
    "prepare": "pre(前) + par(准备) + e → 提前准备 → 准备/预备",
    "prescribe": "pre(前) + scrib(写) + e → 提前写好 → 开药方/规定/指示",
    "present": "pre(前) + sent(存在) → 存在于前 → 当前/礼物/出席/呈现",
    "preserve": "pre(前) + serv(保持) + e → 提前保持 → 保存/保护/保鲜",
    "president": "pre(前) + sid(坐) + ent → 坐在前面的人 → 总统/校长/主席",
    "pressure": "press(压) + ure → 压的状态 → 压力/压迫/压强",
    "presumably": "pre(前) + sum(拿取) + ably → 预先拿住的 → 大概/可能/据推测",
    "prevail": "pre(前) + vail(强大) → 强大在前 → 盛行/占上风/说服",
    "prevent": "pre(前) + vent(来) → 提前来阻 → 防止/预防/阻止",
    "previous": "pre(前) + vi(路) + ous → 走在路前面的 → 先前的/以前的",
    "primarily": "prim(第一) + arily → 首先/主要地",
    "primary": "prim(第一) + ary → 第一的 → 主要的/初级的/小学的",
    "prime": "prim(第一) + e → 第一的 → 主要的/最好的/全盛期",
    "primitive": "prim(第一) + itive → 最初的 → 原始的/简单的/早期的",
    "principal": "prince(首要) + ip + al → 首要的 → 校长/主要的/本金",
    "principle": "prince(首要) + iple → 首要的规则 → 原则/原理/信条",
    "priority": "prior(前) + ity → 之前的 → 优先/重点/优先权",
    "privilege": "priv(私人的) + i + leg(法律) + e → 私人法律 → 特权/优惠/荣幸",
    "probable": "prob(证明) + able → 可证明的 → 很可能的/大概的",
    "procedure": "pro(前) + ced(走) + ure → 向前走 → 程序/手续/步骤",
    "proceed": "pro(前) + ceed(走) → 向前走 → 继续进行/前进/着手",
    "process": "pro(前) + cess(走) → 向前走的过程 → 过程/处理/加工",
    "proclaim": "pro(向前) + claim(喊) → 向前喊 → 宣布/声明/表明",
    "produce": "pro(向前) + duc(引导) + e → 向前引导 → 生产/制造/产生",
    "profession": "pro(向外) + fess(说) + ion → 在众人前说 → 职业/专业/表白",
    "professional": "profession(职业) + al → 专业的/职业的/专业人士",
    "proficient": "pro(前) + fic(做) + ient → 提前做好的 → 熟练的/精通的",
    "profit": "pro(前) + fit(做) → 向前做 → 利润/利益/得益",
    "profound": "pro(前) + found(底) → 到底的 → 深远的/深刻的/渊博的",
    "program": "pro(前) + gram(写) → 预先写好的 → 程序/节目/计划/课程",
    "progress": "pro(前) + gress(走) → 向前走 → 进步/进展/前进",
    "prohibit": "pro(前) + hib(持有) + it → 在前面拦住 → 禁止/阻止/妨碍",
    "project": "pro(前) + ject(投掷) → 向前投掷 → 项目/计划/投射/投影",
    "prominent": "pro(前) + min(突出) + ent → 向前突出的 → 突出的/杰出的/显著的",
    "promise": "pro(前) + mis(发送) + e → 提前发送 → 承诺/答应/希望",
    "promote": "pro(前) + mot(移动) + e → 向前移动 → 促进/提升/推广/促销",
    "prompt": "来自拉丁语 promptus(拿出来的) → 迅速的/提示/促使",
    "pronounce": "pro(向外) + nounce(报告) → 报告出来 → 宣布/发音/宣判",
    "proof": "prove(证明) → 证明的结果 → 证据/证明/校样",
    "propaganda": "pro(前) + pag(固定) + anda → 向前固定的 → 宣传/鼓吹",
    "proper": "propr(自己的) → 自己的 → 适当的/恰当的/得体的",
    "property": "propr(自己的) + ty → 自己的东西 → 财产/性质/房产/属性",
    "portion": "port(部分) + ion → 部分/一份/命运",
    "proportion": "pro(按照) + port(部分) + ion → 按照部分 → 比例/均衡/部分",
    "propose": "pro(前) + pos(放置) + e → 放在前面 → 提议/建议/求婚",
    "prospect": "pro(前) + spect(看) → 向前看 → 前景/展望/潜在客户",
    "prosper": "pro(前) + sper(希望) → 充满希望 → 繁荣/兴旺/成功",
    "protect": "pro(前) + tect(掩盖) → 在前面掩盖 → 保护/防护/保卫",
    "protest": "pro(前) + test(证明) → 证明反对 → 抗议/反对/申明",
    "prove": "pro(前) + ve(看) + e → 让人看见 → 证明/证实/结果是",
    "provide": "pro(前) + vid(看) + e → 向前看 → 提供/供应/规定",
    "province": "pro(前) + vinc(征服) + e → 被征服的地区 → 省/领域/范围",
    "provision": "pro(前) + vis(看) + ion → 向前看 → 供应/预备/条款/给养",
    "provoke": "pro(前) + vok(叫喊) + e → 向前叫喊 → 激怒/挑衅/引起",
    "psychology": "psych(心灵) + logy(学) → 心理学",
    "publish": "publ(人) + ish → 让人知道 → 出版/发布/发表",
    "purchase": "pur(为了) + chase(追逐) → 追逐 → 购买/采购",
    "pursue": "pur(为了) + sue(跟随) → 跟随 → 追求/追赶/从事",
    "qualify": "qual(类别) + ify(使) → 使成为某类 → 使合格/限定/描述",
    "quantity": "quant(多少) + ity → 数量/大量/总量",
    "quarter": "quart(四) + er → 四分之一/季度/一刻钟/宿舍",
    "questionnaire": "quest(问) + ionnaire → 问的卷子 → 问卷/调查表",
    "random": "来自古法语 randir(奔跑) → 奔跑的 → 随机的/任意的/随意",
    "range": "来自古法语 ranger(排列) → 范围/山脉/排列/射程",
    "rapid": "rap(抢夺) + id → 抢夺般的 → 迅速的/快的/急促的",
    "rare": "rar(稀) + e → 稀有的/罕见的/半熟的",
    "rational": "rat(计算) + ional → 能计算的 → 理性的/合理的/神智正常的",
    "reaction": "re(向后) + act(行动) + ion → 向后行动 → 反应/回应/反作用",
    "realistic": "real(真的) + istic → 现实的/务实的/现实主义的",
    "realize": "real(真的) + ize(使) → 使成为真的 → 认识到/实现/领悟",
    "reality": "real(真的) + ity → 真实/现实/实际",
    "reasonable": "reason(理由) + able → 有理由的 → 合理的/适度的/讲理的",
    "rebel": "re(反对) + bel(战争) → 反战 → 反叛/造反/叛逆者",
    "receipt": "re(向后) + ceipt(拿取) → 取回凭据 → 收据/接收/收到",
    "receive": "re(向后) + ceive(拿取) → 拿回 → 收到/接收/接待",
    "recent": "re(加强) + cen(新) + t → 最新的 → 最近的/近来的",
    "reception": "re(向后) + cept(拿取) + ion → 接收/接待/招待会",
    "recession": "re(向后) + cess(走) + ion → 向后走 → 衰退/经济衰退/撤回",
    "recognize": "re(加强) + cogn(知道) + ize → 知道 → 认出/承认/识别",
    "recommend": "re(加强) + commend(推荐) → 大力推荐 → 推荐/建议/称赞",
    "reconcile": "re(再) + concil(和解) + e → 再和解 → 使和解/调和/调停",
    "recover": "re(再) + cover(覆盖) → 重新覆盖 → 恢复/康复/收回",
    "recruit": "re(再) + cruit(成长) → 再成长 → 招募/招聘/新成员",
    "reduce": "re(向后) + duc(引导) + e → 向后引 → 减少/降低/缩小",
    "refer": "re(向后) + fer(搬运) → 搬回 → 参考/提及/提交/查阅",
    "reflect": "re(向后) + flect(弯曲) → 弯回 → 反映/反射/思考",
    "reform": "re(再) + form(形式) → 再造型 → 改革/改造/改良",
    "refresh": "re(再) + fresh(新鲜的) → 再变新鲜 → 使恢复/使清新/刷新",
    "refugee": "re(向后) + fug(逃) + ee → 逃到后方的人 → 难民/逃亡者",
    "refund": "re(向后) + fund(资金) → 退回资金 → 退款/退还/偿还",
    "refuse": "re(向后) + fus(倒) + e → 倒回 → 拒绝/废弃物",
    "regard": "re(加强) + gard(看) → 看 → 认为/看待/关注/尊重",
    "regime": "reg(统治) + ime → 统治体制 → 政权/政体/体制",
    "region": "reg(统治) + ion → 统治的区域 → 地区/区域/领域",
    "register": "re(向后) + gist(搬运) + er → 搬回记录 → 登记/注册/寄存器",
    "regulate": "reg(统治) + ul + ate → 统治 → 调节/调整/管控",
    "reinforce": "re(再) + in(加强) + force(力量) → 再加力量 → 加强/加固/增援",
    "reject": "re(向后) + ject(投掷) → 扔回 → 拒绝/抛弃/排斥",
    "relate": "re(向后) + lat(搬运) + e → 搬回 → 涉及/关联/讲述/相处",
    "relative": "re(向后) + lat(搬运) + ive → 有关系的 → 相对的/相关的/亲戚",
    "release": "re(向后) + lease(放松) → 放松回去 → 释放/发布/松开",
    "relevant": "re(加强) + lev(举) + ant → 举到相关 → 相关的/切题的/有意义的",
    "relief": "re(加强) + lief(举起) → 举起来 → 减轻/救济/欣慰/浮雕",
    "religion": "re(加强) + lig(捆绑) + ion → 捆绑心灵 → 宗教/信仰/信念",
    "reluctant": "re(反对) + luct(斗争) + ant → 斗争反对 → 不情愿的/勉强的",
    "rely": "re(加强) + ly(捆绑) → 捆在一起 → 依赖/依靠/信赖",
    "remain": "re(加强) + main(停留) → 留在原地 → 剩下/保持/遗留",
    "remark": "re(加强) + mark(标记) → 做标记 → 评论/注意到/言论",
    "remedy": "re(再) + med(治愈) + y → 再治愈 → 补救/治疗/药物",
    "remind": "re(再) + mind(心) → 再挂在心上 → 提醒/使想起",
    "remote": "re(向后) + mot(移动) + e → 移动到远处 → 遥远的/偏僻的/远程的",
    "remove": "re(向后) + mov(移动) + e → 移走 → 移除/去除/搬家",
    "render": "ren(使) + der(给) → 使给 → 提供/使得/翻译/渲染",
    "renew": "re(再) + new(新的) → 再变新 → 更新/续约/恢复",
    "repeal": "re(再) + peal(推动) → 推回去 → 废除/撤销/废止",
    "repeat": "re(再) + peat(寻求) → 再寻求 → 重复/反复/重做",
    "replace": "re(再) + place(放置) → 重新放置 → 取代/替换/放回",
    "represent": "re(再) + present(出现) → 再次出现 → 代表/表示/象征",
    "repress": "re(再) + press(压) → 压住 → 压制/镇压/压抑",
    "reproduce": "re(再) + produce(生产) → 再生产 → 繁殖/复制/再生",
    "republic": "re(事物) + public(公众) → 公众的事务 → 共和国/共和政体",
    "reputation": "re(再) + put(思考) + ation → 反复思考 → 名声/声誉/名气",
    "request": "re(加强) + quest(问) → 再问 → 请求/要求/需求",
    "require": "re(再) + quire(寻求) → 再寻求 → 要求/需要/命令",
    "rescue": "re(加强) + scue(抖) → 抖去危险 → 营救/救援/解救",
    "resemble": "re(再) + sembl(类似) + e → 再类似 → 像/类似/相似",
    "resent": "re(反对) + sent(感觉) → 感觉反对 → 憎恨/怨恨/愤慨",
    "reserve": "re(再) + serv(保持) + e → 再保持 → 保留/预订/储备/保护区",
    "reside": "re(再) + sid(坐) + e → 一直坐着 → 居住/存在于/属于",
    "resign": "re(再) + sign(标记) → 重新签名 → 辞职/放弃/顺从",
    "resist": "re(反对) + sist(站) → 站在对面 → 抵抗/抗拒/抵挡",
    "resolve": "re(再) + solv(解决) + e → 再解决 → 解决/决心/分解/决议",
    "resort": "re(再) + sort(出去) → 再出去 → 度假地/凭借/诉诸",
    "resource": "re(再) + source(来源) → 再来源 → 资源/财力/智谋",
    "respond": "re(再) + spond(承诺) → 承诺回应 → 回答/响应/反应",
    "responsible": "re(再) + spons(承诺) + ible → 能回应的 → 负责的/有责任的/可靠的",
    "restore": "re(再) + stor(建立) + e → 重建 → 恢复/修复/归还",
    "restrain": "re(再) + strain(拉紧) → 拉紧 → 抑制/克制/限制",
    "restrict": "re(再) + strict(拉紧) → 拉紧 → 限制/约束/限定",
    "result": "re(再) + sult(跳) → 跳回来 → 结果/后果/导致",
    "resume": "re(再) + sume(拿取) → 再拿起来 → 重新开始/恢复/简历(读音不同)",
    "retail": "re(再) + tail(切割) → 切割成小份 → 零售/零卖",
    "retain": "re(再) + tain(持有) → 再持有 → 保持/保留/记住",
    "retire": "re(向后) + tire(拉) → 拉回 → 退休/退役/退出",
    "retreat": "re(向后) + treat(拉) → 拉回 → 撤退/退却/隐退/静修",
    "reveal": "re(向后) + veal(面纱) → 去掉面纱 → 揭露/揭示/展现",
    "revenue": "re(再) + ven(来) + ue → 再来的 → 收入/税收/财政收入",
    "reverse": "re(向后) + vers(转) + e → 向后转 → 相反的/反转/倒车",
    "review": "re(再) + view(看) → 再看 → 复习/评论/检查/回顾",
    "revise": "re(再) + vis(看) + e → 再看 → 修订/修改/复习",
    "revive": "re(再) + viv(活) + e → 再活 → 复活/复兴/苏醒",
    "revolt": "re(反对) + volt(转) → 转向反面 → 反叛/起义/厌恶/反抗",
    "revolution": "re(再) + volut(转) + ion → 再转 → 革命/旋转/变革",
    "revolve": "re(再) + volv(转) + e → 再转 → 旋转/围绕/反复思考",
    "reward": "re(加强) + ward(保护) → 保护回来 → 奖赏/报酬/酬金",
    "rhythm": "来自希腊语 rhythmos → 节奏/韵律/节律",
    "ridiculous": "rid(笑) + ic + ulous → 让人笑的 → 荒谬的/可笑的",
    "rigid": "rig(硬) + id → 硬的 → 僵硬的/严格的/死板的",
    "rival": "riv(河流) + al → 共用河水的人 → 竞争对手/敌手/匹敌",
    "romantic": "来自法语 romant(小说) + ic → 小说般的 → 浪漫的/情爱的/浪漫主义的",
    "rotate": "rot(轮子) + ate → 使转 → 旋转/轮流/轮换",
    "routine": "rout(路) + ine → 老路 → 常规/惯例/日常的/例行公事",
    "sacrifice": "sacr(神圣) + ifice(做) → 做神圣的事 → 牺牲/献祭/奉献",
    "salary": "sal(盐) + ary → 发盐 → 薪水/工资(古罗马盐是报酬)",
    "sample": "来自 example → 样品/样本/抽样",
    "sanction": "sanc(神圣) + tion → 神圣的认可 → 批准/认可/制裁",
    "satellite": "sat(足够) + ellite → 随从 → 卫星/人造卫星/附属国",
    "satisfy": "satis(足够) + fy(使) → 使足够 → 使满意/满足/符合",
    "scale": "来自拉丁语 scala(梯子) → 规模/比例/刻度/天平/攀登",
    "scatter": "来自拉丁语 scatter(散开) → 分散/散开/散布/驱散",
    "schedule": "来自拉丁语 sched(纸) + ule → 纸片 → 时间表/日程/安排",
    "scheme": "来自希腊语 schema(形式) → 计划/方案/阴谋/体系/图式",
    "scholar": "schol(学校) + ar(人) → 学校的人 → 学者/有学问的人/奖学金获得者",
    "scientific": "sci(知道) + ent + ific → 懂的知识 → 科学的/系统的",
    "scope": "来自希腊语 skopein(看) → 范围/视野/机会/余地",
    "scrutiny": "scrut(检查) + iny → 仔细检查 → 详细审查/监督/细看",
    "seal": "来自拉丁语 sigillum(印记) → 印章/密封/海豹/封条",
    "search": "来自拉丁语 circare(转) → 搜索/搜寻/调查",
    "section": "sect(切割) + ion → 切成的部分 → 部分/章节/截面/区域",
    "secure": "se(不) + cur(关心) + e → 不担心 → 安全的/牢固的/获得/保护",
    "security": "se(不) + cur(关心) + ity → 不担心 → 安全/保安/证券/抵押品",
    "segment": "seg(切割) + ment → 切割结果 → 部分/段/环节/分割",
    "select": "se(分开) + lect(选择) → 选出来 → 选择/挑选/精选的",
    "senior": "sen(老) + ior → 年长的/资深的/上级/高年级的",
    "sensation": "sens(感觉) + ation → 感觉/轰动/知觉",
    "sensible": "sens(感觉) + ible → 能感觉的 → 明智的/合理的/可察觉的",
    "sensitive": "sens(感觉) + itive → 敏感的/灵敏的/感光的/体贴的",
    "sentiment": "sens(感觉) + i + ment → 感觉 → 情感/情绪/观点/感伤",
    "sequence": "sequ(跟随) + ence → 跟随 → 顺序/序列/连续/后果",
    "series": "ser(连接) + ies → 连接在一起 → 系列/连续/系列节目",
    "severe": "sev(严厉) + ere → 严厉的/严重的/剧烈的/严峻的",
    "sexual": "sex(性别) + ual → 性的/性别的/有性生殖的",
    "shelter": "来自古英语 scieldtruma(盾牌部队) → 遮蔽/庇护所/避难所",
    "shift": "来自古英语 sciftan(分开) → 转换/转移/轮班/换档",
    "signal": "sign(标记) + al → 做标记 → 信号/标志/显著的",
    "signature": "sign(标记) + ature → 标记 → 签名/署名/特征",
    "significance": "sign(标记) + ific(做) + ance → 做了标记 → 重要性/意义/含义",
    "significant": "sign(标记) + ific(做) + ant → 做了标记的 → 重要的/有意义的/显著的",
    "similar": "simil(相同) + ar → 相似的/类似的",
    "simulate": "simul(模拟) + ate → 模拟/假装/模仿",
    "simultaneous": "simul(相同) + tane(时间) + ous → 相同时间的 → 同时的/同步的",
    "sincere": "sin(不) + cere(腐) → 不腐烂的 → 真诚的/诚挚的/真心实意的",
    "situation": "situ(位置) + ation → 位置 → 情况/形势/局面/位置",
    "skeptical": "skept(看) + ical → 看了又看的 → 怀疑的/不相信的",
    "sketch": "来自意大利语 schizzo(草图) → 素描/草图/概述/速写",
    "skilled": "skill(技能) + ed → 有技能的 → 熟练的/有技巧的/技术性的",
    "slavery": "slav(奴隶) + ery → 奴隶制/奴隶身份/奴役",
    "slogan": "来自盖尔语 sluagh-ghairm(战斗口号) → 标语/口号/广告语",
    "solution": "solut(解) + ion → 解释/溶液/解决方案",
    "solve": "来自拉丁语 solvere(解开) → 解决/解答/求解",
    "somewhat": "some(有些) + what(什么) → 有点/稍微/有几分",
    "sophisticated": "soph(智慧) + isticated → 充满智慧的 → 老练的/复杂的/精密的",
    "source": "来自拉丁语 surgere(升起) → 来源/出处/源头/消息源",
    "spacecraft": "space(太空) + craft(船) → 宇宙飞船/航天器",
    "span": "来自古英语 spann(跨度) → 跨度/一段时间/范围/横跨",
    "specialist": "special(专门的) + ist(人) → 专家/专门医师",
    "specialize": "special(专门) + ize(使) → 专门化 → 专攻/专门从事",
    "species": "spec(看) + ies → 看起来像的群 → 物种/种类/类型",
    "specific": "spec(看) + ific → 看得出 → 具体的/特定的/特有的/明确的",
    "specify": "spec(看) + ify(使) → 使看清 → 指定/详述/明确说明",
    "spectacle": "spect(看) + acle → 看的 → 景象/奇观/眼镜",
    "spectacular": "spect(看) + acular → 好看的 → 壮观的/惊人的/精彩的",
    "speculate": "spec(看) + ulate → 看 → 推测/投机/思索",
    "sphere": "来自希腊语 sphaira(球) → 球体/球面/范围/领域",
    "spirit": "spir(呼吸) + it → 呼吸 → 精神/灵魂/烈酒/情绪",
    "spiritual": "spirit(精神) + ual → 精神的/心灵的/宗教的",
    "sponsor": "spons(承诺) + or → 承诺的人 → 赞助商/主办/发起",
    "stability": "st(站立) + ability → 能站住 → 稳定/稳定性/稳固",
    "stable": "st(站立) + able → 能站住的 → 稳定的/稳固的/马厩",
    "standard": "st(站) + ard → 站立的基准 → 标准/规格/标准的/普通的",
    "statement": "state(陈述) + ment → 陈述/声明/报表/说法",
    "station": "st(站) + ation → 站的地方 → 车站/站/位置/驻扎",
    "statistic": "st(站) + atistic → 站在那的数据 → 统计/统计数据",
    "status": "st(站) + atus → 站的状态 → 地位/状态/身份/情形",
    "steady": "st(站) + eady → 站稳的 → 稳定的/稳的/持续的/固定",
    "stereotype": "stereo(硬) + type(类型) → 硬性的类型 → 刻板印象/固定模式",
    "stimulate": "stim(刺) + ul + ate → 刺 → 刺激/激励/激发/促进",
    "stipulate": "stip(点) + ul + ate → 点明 → 规定/明确要求/约定",
    "strategy": "来自希腊语 strategia(将军术) → 策略/战略/计谋",
    "stress": "来自拉丁语 strictus(拉紧) → 压力/强调/紧张/重音",
    "structure": "struct(建造) + ure → 建造的结果 → 结构/构造/建筑物",
    "struggle": "strugg(努力) + le → 努力 → 斗争/奋斗/挣扎/努力",
    "studio": "来自拉丁语 studium(研究) → 工作室/画室/录音棚/摄影棚",
    "stuff": "来自古法语 estoffe(材料) → 东西/材料/填充/塞满",
    "subject": "sub(在…下) + ject(投掷) → 投在下面 → 主题/科目/主语/使服从",
    "submit": "sub(在…下) + mit(发送) → 送下去 → 提交/服从/屈从/呈递",
    "subsequent": "sub(在下) + sequ(跟随) + ent → 跟在下面的 → 随后的/后来的",
    "substance": "sub(在下) + st(站) + ance → 站在下面的 → 物质/实质/内容/根据",
    "substantial": "sub(在下) + st(站) + antial → 站在下面的 → 大量的/实质的/重要的/充实的",
    "substitute": "sub(在下) + stit(放置) + ute → 放在下面代替 → 代替/替代品/替换",
    "subtle": "sub(在下) + tle(织) → 织在下面的 → 微妙的/精妙的/敏锐的/隐约的",
    "suburb": "sub(近) + urb(城市) → 城市近郊 → 郊区/近郊/城郊",
    "succeed": "suc(近) + ceed(走) → 走近 → 成功/接替/接着发生",
    "succession": "suc(近) + cess(走) + ion → 走近 → 连续/继承/一连串",
    "sufficient": "suf(下) + fic(做) + ient → 做到下面的 → 足够的/充分的",
    "suggest": "sug(下) + gest(搬运) → 带到下面 → 建议/暗示/表明/推荐",
    "summary": "sum(总) + ary → 总起来的 → 摘要/总结/概要",
    "summit": "sum(最高) + mit → 最高点 → 顶峰/首脑会议/顶点",
    "superb": "super(超) + b → 超好的 → 极好的/卓越的/华丽的",
    "superficial": "super(上) + fic(脸) + ial → 脸上的 → 表面的/肤浅的/浅薄的",
    "superior": "super(上) + ior → 更好的 → 上级的/优秀的/优越的/高傲的",
    "supervise": "super(上) + vis(看) + e → 在上看 → 监督/管理/指导",
    "supplement": "supple(填充) + ment → 填进去的东西 → 补充/增补/补品/附录",
    "supply": "sup(下) + ply(填) → 填满 → 供应/供给/提供/补给",
    "support": "sup(下) + port(搬运) → 从下搬 → 支持/支撑/资助/养活",
    "suppose": "sup(下) + pos(放置) + e → 放在下面 → 假设/认为/假定/推测",
    "suppress": "sup(下) + press(压) → 压下 → 压制/抑制/镇压/隐瞒",
    "supreme": "sup(上) + reme(最) → 最上面的 → 最高的/至上的/极度的",
    "surface": "sur(上) + face(脸) → 上面 → 表面/外表/水面/地面",
    "surgery": "来自希腊语 cheir(手) + erg(工作) → 手工作 → 外科手术/诊所",
    "surplus": "sur(超出) + plus(加) → 超出 → 盈余/剩余/过剩的",
    "surprise": "sur(上) + prise(拿取) → 被拿住 → 使惊奇/惊讶/意外",
    "surrender": "sur(上) + render(交出) → 交出 → 投降/放弃/交出/屈服",
    "surround": "sur(上) + round(圆的) → 在周围 → 包围/围绕/环绕",
    "survey": "sur(上) + vey(看) → 在上面看 → 调查/测量/勘察/审视",
    "survive": "sur(超过) + viv(活) + e → 活得超过 → 幸存/存活/比…活得长",
    "suspect": "sus(下) + spect(看) → 向下看 → 怀疑/嫌疑犯/可疑的",
    "suspend": "sus(下) + pend(悬挂) → 挂下面 → 暂停/悬挂/停职/推迟",
    "suspicion": "sus(下) + pic(看) + ion → 向下看 → 怀疑/嫌疑/猜疑",
    "sustain": "sus(下) + tain(持有) → 在下托住 → 维持/支撑/遭受/持续",
    "sustainable": "sustain(维持) + able → 可维持的 → 可持续的/可承受的",
    "symbol": "sym(共同) + bol(投掷) → 共同投掷的标记 → 象征/符号/标志",
    "sympathy": "sym(共同) + path(感情) + y → 共同感情 → 同情/共鸣/赞同",
    "symptom": "sym(共同) + ptom(落下) → 共同落下的 → 症状/征兆/症候",
    "synthetic": "syn(共同) + thet(放置) + ic → 放在一起的 → 合成的/人造的/综合的",
    "system": "sys(共同) + st(站立) + em → 站在一起的 → 系统/体系/体制/制度",
    "tactic": "来自希腊语 taktikē(排列术) → 战术/策略/手段",
    "target": "来自古法语 targette(小盾牌) → 目标/对象/靶子",
    "task": "来自拉丁语 taxa(税) → 任务/工作/作业",
    "taste": "来自古法语 taster(尝) → 味道/品味/尝/体验",
    "tax": "来自拉丁语 taxare(评估) → 税/税收/征税/负担",
    "technique": "techn(技术) + ique → 技术/技巧/手法/技能",
    "technology": "techn(技术) + logy(学) → 技术学 → 技术/工艺/科技",
    "tedious": "来自拉丁语 taedium(厌倦) → 乏味的/冗长的/沉闷的",
    "telescope": "tele(远) + scope(看) → 看远 → 望远镜",
    "temperature": "temper(混合) + ature → 混合的程度 → 温度/体温/气温/发烧",
    "temporary": "tempor(时间) + ary → 只在一段时间的 → 暂时的/临时的",
    "tempt": "来自拉丁语 temptare(试) → 诱惑/引诱/怂恿/吸引",
    "tendency": "tend(伸展) + ency → 伸向的方向 → 趋势/倾向/趋向",
    "tender": "tend(伸展) + er → 伸出的 → 温柔的/嫩的/脆弱的/投标",
    "tense": "来自拉丁语 tendere(伸展) → 拉紧的 → 紧张的/时态/拉紧",
    "tension": "tens(伸展) + ion → 拉紧 → 紧张/张力/压力/拉紧",
    "terminal": "termin(边界) + al → 边界的 → 终点的/航站楼/终端/晚期的",
    "terminate": "termin(边界) + ate → 到边界 → 终止/结束/解雇",
    "territory": "terr(土地) + itory → 土地范围 → 领土/领域/区域/版图",
    "terror": "来自拉丁语 terrere(使害怕) → 恐怖/恐惧/可怕的人或事",
    "testify": "test(证明) + ify(使) → 证明 → 作证/证明/表明",
    "testimony": "test(证明) + imony → 证明的东西 → 证词/证据/证明",
    "textile": "text(编织) + ile → 编织品 → 纺织品/纺织业",
    "theme": "来自希腊语 thema(放置) → 主题/题目/主旋律",
    "theoretical": "theor(看) + etical → 看出来的 → 理论的/理论上的/假设的",
    "therapy": "来自希腊语 therapeia(治疗) → 治疗/疗法/理疗",
    "thereby": "there(那里) + by(通过) → 借此/从而/因此",
    "therefore": "there(那里) + fore(前) → 在那前面 → 因此/所以/为此",
    "thermometer": "therm(热) + o + meter(计) → 热度计 → 温度计/体温计",
    "thesis": "来自希腊语 tithenai(放置) → 论文/论点/论题/命题",
    "thorough": "来自古英语 thurh(穿过) → 彻底的/全面的/详尽的/完全的",
    "threshold": "thresh(打谷) + hold(握) → 打谷场入口 → 门槛/开始/阈/入口",
    "thriller": "thrill(激动) + er → 让人激动的 → 惊悚片/恐怖小说",
    "thrive": "来自古挪威语 thrifask(繁荣) → 繁荣/茁壮成长/兴旺",
    "tolerance": "toler(忍受) + ance → 忍受 → 容忍/宽容/忍耐力/耐受性",
    "tolerate": "toler(忍受) + ate → 忍受 → 容忍/宽容/忍耐/容许",
    "torture": "tort(扭) + ure → 扭 → 折磨/拷打/痛苦/扭曲",
    "tough": "来自古英语 toh(坚韧的) → 坚韧的/困难的/强硬的/严厉的",
    "tourism": "tour(游) + ism → 旅游/旅游业/观光",
    "track": "来自古法语 trac(痕迹) → 轨道/足迹/跟踪/跑道",
    "tradition": "tra(穿过) + dit(给) + ion → 传下去 → 传统/惯例/传说",
    "traffic": "tra(穿过) + ffic(做) → 穿行 → 交通/运输/交易",
    "tragedy": "来自希腊语 tragos(山羊) + ode(歌) → 山羊的歌(古希腊悲剧) → 悲剧/灾难/惨案",
    "trail": "来自拉丁语 trahere(拉) → 痕迹/小径/跟踪/拖/尾随",
    "transfer": "trans(横穿) + fer(搬运) → 搬运过去 → 转移/转让/调动/换乘",
    "transform": "trans(横穿) + form(形式) → 改变形式 → 转变/改造/变形/转换",
    "transient": "trans(穿过) + ient → 穿过的 → 短暂的/转瞬即逝的/临时的",
    "transit": "trans(穿过) + it(走) → 走过去 → 运输/过境/中转/公共交通",
    "translation": "trans(穿过) + lat(搬运) + ion → 搬运过去 → 翻译/转化/移动",
    "transmission": "trans(穿过) + miss(发送) + ion → 发送过去 → 传输/传递/传染/播送",
    "transparent": "trans(穿过) + par(显现) + ent → 能看穿的 → 透明的/明显的/坦率的",
    "transport": "trans(穿过) + port(搬运) → 搬运过去 → 运输/交通/运送/交通工具",
    "trap": "来自古英语 treppe(陷阱) → 陷阱/圈套/捕捉/困住",
    "trauma": "来自希腊语 trauma(伤) → 创伤/损伤/精神创伤/外伤",
    "treasure": "来自希腊语 thesauros(宝库) → 宝藏/珍宝/珍视/珍惜",
    "treat": "来自拉丁语 tractare(处理) → 对待/处理/治疗/款待/请客",
    "treaty": "treat(处理) + y → 处理的文书 → 条约/协定/协议/契约",
    "tremendous": "trem(颤抖) + endous → 让人颤抖的 → 巨大的/惊人的/极好的",
    "trend": "来自古英语 trendan(转) → 趋势/潮流/倾向/时尚",
    "trial": "来自拉丁语 tria(三) → 三个人(法庭) → 审判/试验/试用/考验",
    "triangle": "tri(三) + angle(角) → 三角形/三角铁/三角关系",
    "tribe": "来自拉丁语 tribus(三个部族) → 部落/宗族/族类",
    "tribute": "来自拉丁语 tribuere(支付) → 贡品/颂词/致敬/礼物",
    "trigger": "来自荷兰语 trekker(拉动者) → 扳机/触发器/引发/触发",
    "triumph": "来自拉丁语 triumphus(凯旋) → 胜利/凯旋/巨大的成功/喜悦",
    "trivial": "tri(三) + vi(路) + al → 三条路交汇处的(闲聊) → 琐碎的/微不足道的/不重要的",
    "tropical": "trop(转) + ical → 太阳转向的 → 热带的/炎热的/热带地区的",
    "troublesome": "trouble(麻烦) + some(…的) → 麻烦的/令人烦恼的/棘手的",
    "trust": "来自古挪威语 traust(力量) → 信任/信赖/托付/相信",
    "tutor": "来自拉丁语 tueri(保护) → 导师/家教/辅导/教导",
    "twist": "来自古英语 twist(绳索) → 扭转/扭曲/缠绕/曲折/转折",
    "ultimate": "ultim(最后) + ate → 最后的 → 终极的/最终的/根本的/极端的",
    "unanimous": "un(一个) + anim(精神) + ous → 一个精神的 → 一致的/全体同意的",
    "uncover": "un(不) + cover(覆盖) → 揭开覆盖 → 揭露/发现/揭开",
    "undergo": "under(下) + go(走) → 从下走过 → 经历/遭受/经受/承受",
    "undergraduate": "under(下) + graduate(毕业生) → 未毕业的 → 本科生/大学在读的",
    "underestimate": "under(下) + estimate(估计) → 低估 → 低估/轻视/看轻",
    "underground": "under(下) + ground(地面) → 地下的/地铁/秘密的/地下组织",
    "underline": "under(下) + line(线) → 下划线 → 强调/突出/在…下划线",
    "undermine": "under(下) + mine(挖) → 在下面挖 → 削弱/破坏/侵蚀/挖墙脚",
    "undertake": "under(下) + take(拿) → 在下面拿住 → 承担/从事/承诺/担保",
    "unemployment": "un(不) + employ(雇佣) + ment → 不被雇佣 → 失业/失业率",
    "unfold": "un(不) + fold(折叠) → 不折叠 → 展开/打开/展现/呈现",
    "unfortunate": "un(不) + fortunate(幸运的) → 不幸运的 → 不幸的/遗憾的/倒霉的",
    "unify": "un(一) + ify(使) → 使成一 → 统一/使一致/联合",
    "unique": "un(一) + ique → 唯一的 → 独特的/独一无二的/特有的",
    "universal": "uni(一) + vers(转) + al → 转成一个整体的 → 普遍的/全体的/宇宙的/通用的",
    "universe": "uni(一) + vers(转) + e → 转成一体 → 宇宙/全人类/领域/万物",
    "unprecedented": "un(不) + pre(前) + ced(走) + ented → 前面没有走过的 → 空前的/史无前例的",
    "update": "up(向上) + date(日期) → 更新日期 → 更新/升级/现代化/最新消息",
    "upgrade": "up(向上) + grade(等级) → 升级 → 升级/提高/改善",
    "uphold": "up(向上) + hold(握) → 向上握住 → 支持/维护/维持/举起",
    "uproar": "up(向上) + roar(吼叫) → 吼叫起来 → 骚动/喧嚣/吵闹",
    "urban": "urb(城市) + an → 城市的/都市的",
    "urge": "来自拉丁语 urgere(驱使) → 催促/强烈欲望/敦促/推动",
    "vacant": "vac(空) + ant → 空的 → 空缺的/空的/空置的/茫然的",
    "vacation": "vac(空) + ation → 空闲 → 假期/休假/度假",
    "vague": "来自拉丁语 vagus(流浪的) → 模糊的/含糊的/不明确的/茫然的",
    "valid": "val(强壮) + id → 强壮的 → 有效的/合理的/有根据的/合法的",
    "value": "val(强壮) + ue → 强壮→价值 → 价值/重视/珍惜/价值观",
    "vanish": "van(空) + ish → 变空 → 消失/消散/灭绝/化为乌有",
    "variable": "vari(变化) + able → 可变的 → 可变的/变量/易变的/多变的",
    "variation": "vari(变化) + ation → 变化/变异/变奏/变体",
    "variety": "vari(变化) + ety → 变化 → 多样性/种类/品种/变化",
    "vast": "来自拉丁语 vastus(空的/巨大的) → 巨大的/广阔的/大量的/浩瀚的",
    "vehicle": "veh(搬运) + icle(小) → 小搬运工具 → 车辆/交通工具/载体媒介",
    "velocity": "veloc(快) + ity → 速度/速率",
    "venture": "来自拉丁语 venire(来) → 冒险来 → 风险/冒险/投机/敢于",
    "verify": "ver(真) + ify(使) → 使真 → 验证/核实/证实/确认",
    "version": "vers(转) + ion → 转出来的 → 版本/说法/形式/译本",
    "versus": "vers(转) + us → 转向 → 对/对抗/与…相对/诉",
    "vertical": "vert(转) + ical → 转直 → 垂直的/竖的/纵向的",
    "vessel": "来自拉丁语 vascellum(小容器) → 容器/船/血管/导管",
    "veteran": "来自拉丁语 vetus(老的) → 老手/老兵/老练的/经验丰富的",
    "via": "来自拉丁语 via(路) → 通过/经由/取道",
    "vibrate": "vibr(震动) + ate → 震动/振动/颤动/摇摆",
    "victim": "来自拉丁语 victima(祭品) → 受害者/牺牲品/牺牲",
    "vigorous": "vig(活力) + or → 强健的 → 充满活力的/强健的/有力的",
    "violate": "viol(暴力) + ate → 使用暴力 → 违反/侵犯/违背/亵渎",
    "virtue": "vir(男人) + tue → 男子气概 → 美德/优点/德行/贞操",
    "visible": "vis(看) + ible(能) → 能看见的 → 可见的/明显的/有形的",
    "vision": "vis(看) + ion → 看的能力 → 视力/视野/愿景/洞察力/幻象",
    "visual": "vis(看) + ual → 视觉的/可见的/视力的",
    "vital": "vit(生命) + al → 生命的 → 至关重要的/生命的/活力的/致命的",
    "vitamin": "vit(生命) + amin → 生命所需 → 维生素",
    "vivid": "viv(生命) + id → 有生命的 → 生动的/鲜艳的/鲜明的/栩栩如生的",
    "vocabulary": "voc(声音) + abulary → 声音的集合 → 词汇/词汇量/词汇表",
    "vocation": "voc(声音) + ation → 听从声音 → 职业/天职/使命/ vocation(源自神召)",
    "volume": "vol(卷) + ume → 卷起来 → 体积/音量/卷/大量/容量",
    "voluntary": "volunt(意愿) + ary → 意愿的 → 自愿的/志愿的/主动的/自发的",
    "volunteer": "volunt(意愿) + eer(人) → 自愿的人 → 志愿者/自愿者/自愿",
    "vulnerable": "vulner(伤) + able → 容易受伤的 → 脆弱的/易受伤的/易受攻击的",
    "welfare": "wel(好) + fare(走) → 好好走 → 福利/幸福/福祉/安康",
    "widespread": "wide(广) + spread(传播) → 广为传播的 → 广泛的/普遍的/分布广的",
    "witness": "wit(知) + ness → 知道的人 → 目击者/证人/见证/证据",
    "workforce": "work(工作) + force(力量) → 工作力量 → 劳动力/职工总数",
    "worship": "wor(值得) + ship(状态) → 值得的状态 → 崇拜/敬仰/礼拜/敬奉",
    "worthwhile": "worth(价值) + while(时间) → 值得花时间的 → 值得的/有价值的",
    "wound": "来自古英语 wund(伤) → 伤口/创伤/伤害/使受伤",
    "wreck": "来自古英语 wrecan(驱) → 失事/沉船/毁坏/残骸",
    "yield": "来自古英语 gieldan(付) → 产出/产生/产量/屈服/让步",
    "zone": "来自希腊语 zone(带) → 区域/地带/地区/时区/分区",
}


# ============================================================
# 2. Network helpers
# ============================================================

USER_AGENT = "PureMemo/1.0 (vocabulary enrichment bot)"
# Batch processing config
API_DELAY = 0  # removed; concurrency handles rate
MAX_WORKERS = 5  # concurrent API requests
CACHE_FILE = "api_cache.json"


def fetch_dictionary(word):
    """从 FreeDictionaryAPI 获取单词数据"""
    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.load(resp)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None  # not found
        raise
    except Exception:
        return None


def fetch_datamuse_ml(word):
    """从 Datamuse 获取近义词"""
    url = f"https://api.datamuse.com/words?ml={urllib.parse.quote(word)}&max=8"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.load(resp)
        return [d["word"] for d in data if d["word"].lower() != word.lower()]
    except Exception:
        return []


# ============================================================
# 3. Root lookup
# ============================================================

def find_roots(word, root_db):
    """查找单词中包含的词根"""
    w_lower = word.lower()
    found = []
    
    # Try to match from longest to shortest
    for root_key in sorted(root_db.keys(), key=len, reverse=True):
        if root_key in w_lower:
            # Skip single-letter matches
            if len(root_key) <= 1:
                continue
            # For short roots (< 4 chars), ensure they form a real morpheme
            # by checking they're at word boundaries (start/end) or followed/preceded by a vowel
            if len(root_key) <= 3:
                idx = w_lower.find(root_key)
                # Check if it's at start, end, or surrounded by vowels/consonants
                prev_char = w_lower[idx - 1] if idx > 0 else ''
                next_char = w_lower[idx + len(root_key)] if idx + len(root_key) < len(w_lower) else ''
                # Skip if it's in the middle of a word surrounded by letters (not a real morpheme)
                if prev_char and prev_char.isalpha() and next_char and next_char.isalpha():
                    continue  # Short root embedded in middle of word - likely false positive
            info = root_db[root_key]
            found.append({
                "root": info["root"],
                "origin": info["origin"],
                "meaning": info["meaning"],
                "related": [r for r in info["related"] if r.lower() != w_lower]
            })
            break  # Only return the best (longest) match
    
    # Check for prefixes (word starts with prefix)
    prefixes = [
        ("un", "un", "不/未"), ("re", "re", "再/重新"), ("pre", "pre", "前/预先"),
        ("dis", "dis", "不/否定/分离"), ("mis", "mis", "错误"), ("over", "over", "过度/上"),
        ("under", "under", "下/不足"), ("out", "out", "超过/外"), ("en", "en", "使"),
        ("em", "em", "使"), ("fore", "fore", "前/预先"), ("inter", "inter", "在…间/相互"),
        ("trans", "trans", "横穿/跨越"), ("sub", "sub", "在…下"), ("super", "super", "超/上"),
        ("anti", "anti", "反对"), ("auto", "auto", "自己"), ("bi", "bi", "二"),
        ("co", "co", "共同"), ("com", "com", "共同"), ("con", "con", "共同"),
        ("de", "de", "向下/去除"), ("ex", "ex", "向外/前"), ("in", "in", "向内/不"),
        ("im", "im", "向内/不"), ("pro", "pro", "向前/赞成"), ("a", "a", "不/无"),
        ("an", "an", "不/无"), ("post", "post", "在…后"), ("extra", "extra", "额外/超出"),
        ("semi", "semi", "半"), ("multi", "multi", "多"), ("micro", "micro", "微"),
        ("macro", "macro", "大"), ("mono", "mono", "单一"), ("poly", "poly", "多"),
    ]
    
    prefix_info = None
    for pfx, rid, meaning in prefixes:
        if w_lower.startswith(pfx) and len(w_lower) > len(pfx) + 2:
            prefix_info = {
                "root": rid,
                "origin": "",
                "meaning": meaning,
                "related": [],
                "is_prefix": True
            }
            break
    
    # Check for suffixes
    suffixes = [
        ("tion", "tion", "名词后缀"), ("sion", "sion", "名词后缀"),
        ("ment", "ment", "名词后缀"), ("ness", "ness", "名词后缀"),
        ("ity", "ity", "名词后缀"), ("ty", "ty", "名词后缀"),
        ("able", "able", "可…的"), ("ible", "ible", "能…的"),
        ("ful", "ful", "充满…的"), ("less", "less", "没有…的"),
        ("ous", "ous", "…性质的"), ("ive", "ive", "…倾向的"),
        ("al", "al", "…的"), ("ize", "ize", "使…化"),
        ("ise", "ise", "使…化"), ("ate", "ate", "使…"),
        ("ify", "ify", "使…化"), ("ly", "ly", "…地"),
        ("er", "er", "…人/物"), ("or", "or", "…人/物"),
        ("ist", "ist", "…主义者/家"), ("ism", "ism", "…主义"),
        ("logy", "logy", "…学"), ("ic", "ic", "…的"),
        ("ical", "ical", "…的"), ("ward", "ward", "向…"),
        ("dom", "dom", "…领域/状态"), ("ship", "ship", "…状态/关系"),
    ]
    
    suffix_info = None
    for sfx, rid, meaning in suffixes:
        if w_lower.endswith(sfx) and len(w_lower) > len(sfx) + 2:
            suffix_info = {
                "root": rid,
                "origin": "",
                "meaning": meaning,
                "related": [],
                "is_suffix": True
            }
            break
    
    return {
        "prefix": prefix_info,
        "root": found[0] if found else None,
        "suffix": suffix_info
    }


# ============================================================
# 4. Frequency tier - importance scoring
# ============================================================

def compute_word_importance(word, meaning):
    """计算单词重要程度分数 (越低越重要)"""
    w_lower = word.lower()
    length = len(w_lower)
    score = 0.0
    
    # 1) 词长：短词更常见
    if length <= 4: score -= 3.0
    elif length <= 5: score -= 2.0
    elif length <= 6: score -= 1.0
    elif length == 7: score -= 0.5
    elif length == 8: score += 0.5
    elif length == 9: score += 1.5
    elif length == 10: score += 2.5
    elif length >= 13: score += 4.5
    elif length >= 11: score += 3.5
    
    # 2) 派生后缀：有派生后缀的词通常更进阶
    deriv_suffixes = ['tion', 'sion', 'ment', 'ness', 'ity', 'able', 'ible',
                      'ous', 'ive', 'ful', 'less', 'ize', 'ify', 'ical',
                      'ward', 'hood', 'ship', 'ance', 'ence', 'ous', 'ism',
                      'ist', 'logy', 'ture', 'sure', 'ative', 'itive']
    for sfx in deriv_suffixes:
        if w_lower.endswith(sfx) and len(w_lower) > len(sfx) + 2:
            score += 1.0
            break
    
    # 3) 否定/反向前缀：un-, im-, in-, ir-, il-, dis-, non-
    neg_prefixes = ['un', 'im', 'in', 'ir', 'il', 'dis', 'non', 'anti', 'counter']
    for pfx in neg_prefixes:
        if w_lower.startswith(pfx) and len(w_lower) > len(pfx) + 3:
            score += 0.5
            break
    
    # 4) 其它常见前缀 (over-, under-, pre-, post-, inter-, trans-, super-, sub-)
    other_prefixes = ['over', 'under', 'pre', 'post', 'inter', 'trans', 'super', 'sub', 'semi', 'multi']
    for pfx in other_prefixes:
        if w_lower.startswith(pfx) and len(w_lower) > len(pfx) + 3:
            score += 0.5
            break
    
    # 5) 复合词（含连字符或由两个词组成）
    if '-' in w_lower:
        score += 1.0
    
    # 6) 罕见字母组合（q, x, z 通常出现在更难/更专业的词中）
    rare_count = sum(1 for ch in w_lower if ch in 'qxz')
    score += rare_count * 0.5
    
    return score


def batch_assign_tiers(words):
    """对整个词库批量分配频次等级（按百分位）"""
    scored = []
    for w in words:
        s = compute_word_importance(w.get("word", ""), w.get("meaning", ""))
        scored.append((s, w))
    
    scored.sort(key=lambda x: x[0])  # 分数升序（最重要的在前）
    
    n = len(scored)
    for i, (score, w) in enumerate(scored):
        pct = i / n  # 百分位 0~1
        if pct < 0.20:
            w["frequencyTier"] = "core"
        elif pct < 0.75:
            w["frequencyTier"] = "common"
        else:
            w["frequencyTier"] = "advanced"
    
    return words


# ============================================================
# 5. Generate mnemonic
# ============================================================

def get_mnemonic(word):
    """获取单词助记"""
    w_lower = word.lower()
    if w_lower in MNEMONICS:
        return MNEMONICS[w_lower]
    return ""


# ============================================================
# 6a. Derive Chinese translation for a collocation phrase
# ============================================================

def _derive_cn_for_phrase(phrase, cn_example, cn_root, word):
    """从例句中文翻译中提取短语的中文对应"""
    # Try to find the word's Chinese meaning in the Chinese translation
    if not cn_root or cn_root == word:
        return ""
    
    # Search for the Chinese root in the Chinese example
    idx = cn_example.find(cn_root)
    if idx >= 0:
        # Extract a reasonable Chinese phrase (usually 2-4 chars around the root)
        start = max(0, idx - 2)
        end = min(len(cn_example), idx + len(cn_root) + 4)
        # Try to get just the meaningful part
        cn_phrase = cn_example[start:end].strip('，。！？、；：""''（）')
        return cn_phrase
    
    # Fallback: just return the word's Chinese root
    return cn_root


# ============================================================
# 6. Main enrichment function
# ============================================================

def enrich_word(word_data, use_api=True):
    """为单个单词生成丰富数据"""
    word = word_data["word"]
    enriched = dict(word_data)
    
    # 1. Frequency tier
    # frequencyTier will be batch-assigned in process_file
    enriched["frequencyTier"] = "common"
    
    # 2. Collocations - extract from existing example with Chinese
    collocations = []
    example = word_data.get("example", "")
    if example and " — " in example:
        eng_part = example.split(" — ")[0].strip()
        cn_part = example.split(" — ")[1].strip()
        # Extract word's Chinese meaning root from the meaning field
        meaning_cn = word_data.get("meaning", "").split(" ")[-1] if " " in word_data.get("meaning", "") else ""
        # Remove leading pos like "v." "n." "adj."
        cn_root = meaning_cn.lstrip("adv.v.n.adj.prep.conj.pron.") if meaning_cn else word
        
        words_in_example = eng_part.replace(".", "").replace(",", "").replace("!", "").replace("?", "").split()
        if len(words_in_example) >= 3:
            for i, w in enumerate(words_in_example):
                if w.lower() == word.lower() and i + 1 < len(words_in_example):
                    phrase = f"{word} {words_in_example[i+1].lower().strip(',.!?')}"
                    # Try to derive Chinese for this phrase
                    # Strategy: if the eng phrase is "verb noun", the cn likely contains "verb-cn noun-cn"
                    cn_trans = _derive_cn_for_phrase(phrase, cn_part, cn_root, word)
                    collocations.append(f"{phrase} — {cn_trans}" if cn_trans else phrase)
                    break
                if w.lower().strip(',.!?') == word.lower() and i > 0:
                    phrase = f"{words_in_example[i-1].lower().strip(',.!?')} {word}"
                    cn_trans = _derive_cn_for_phrase(phrase, cn_part, cn_root, word)
                    collocations.append(f"{phrase} — {cn_trans}" if cn_trans else phrase)
                    break
    
    enriched["collocations"] = collocations[:5]
    
    # 3. Root info
    root_info = find_roots(word, ROOT_DB)
    if root_info["root"] or root_info["prefix"] or root_info["suffix"]:
        enriched["root"] = root_info
    else:
        enriched["root"] = None  # Clear old false matches
    
    # 4. Mnemonic
    mnemonic = get_mnemonic(word)
    if mnemonic:
        enriched["mnemonic"] = mnemonic
    elif root_info.get("root") or root_info.get("prefix"):
        # Auto-generate mnemonic from root info
        parts = []
        if root_info.get("prefix"):
            p = root_info["prefix"]
            parts.append(f"{p['root']}({p['meaning']})")
        if root_info.get("root"):
            r = root_info["root"]
            parts.append(f"{r['root']}({r['meaning']})")
        if root_info.get("suffix"):
            s = root_info["suffix"]
            parts.append(f"{s['root']}({s['meaning']})")
        cn_part = word_data.get("meaning", "").split(" ")[-1] if " " in word_data.get("meaning", "") else ""
        if cn_part:
            cn_part = cn_part.lstrip("adv.v.n.adj.prep.conj.pron.") if len(cn_part) > 2 else cn_part
        if parts and cn_part:
            enriched["mnemonic"] = f"{' + '.join(parts)} → {cn_part}"
        elif parts and word_data.get("meaning"):
            enriched["mnemonic"] = f"{' + '.join(parts)} → {word_data['meaning']}"
    
    # 5. API data (synonyms, antonyms, extra examples)
    if use_api:
        api_data = fetch_dictionary(word)
        if api_data:
            all_synonyms = []
            all_antonyms = []
            extra_examples = []
            
            for meaning in api_data[0].get("meanings", []):
                for s in meaning.get("synonyms", []):
                    if s.lower() not in [x.lower() for x in all_synonyms]:
                        all_synonyms.append(s)
                for a in meaning.get("antonyms", []):
                    if a.lower() not in [x.lower() for x in all_antonyms]:
                        all_antonyms.append(a)
                for d in meaning.get("definitions", []):
                    if d.get("example") and d["example"] != example:
                        extra_examples.append(d["example"])
            
            enriched["synonyms"] = all_synonyms[:10]
            enriched["antonyms"] = all_antonyms[:5]
            enriched["extraExamples"] = extra_examples[:3]
            
            # Also try Datamuse for related words if we have few synonyms
            if len(all_synonyms) < 3:
                try:
                    related = fetch_datamuse_ml(word)
                    enriched["relatedWords"] = related[:5]
                except Exception:
                    pass
    
    return enriched


def process_file(input_path, output_path, max_words=None, resume=False, use_api=True):
    """处理一个词库文件"""
    print(f"📖 读取: {input_path}")
    with open(input_path, "r", encoding="utf-8") as f:
        words = json.load(f)
    
    print(f"   共 {len(words)} 个单词")
    
    # Resume: load existing output
    existing = {}
    if resume and os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            for w in json.load(f):
                existing[w["word"]] = w
    
    if max_words:
        words = words[:max_words]
    
    enriched = []
    total = len(words)
    processed = 0
    lock = threading.Lock()
    
    def process_one(w):
        nonlocal processed
        word = w["word"]
        
        # Skip if already processed (resume mode)
        if word in existing and "frequencyTier" in existing[word]:
            with lock:
                enriched.append(existing[word])
                processed += 1
            return
        
        try:
            result = enrich_word(w, use_api=use_api)
            with lock:
                enriched.append(result)
                processed += 1
                pct = processed / total * 100
                has_root = "root" in result and (isinstance(result["root"], dict) and (result["root"].get("root") or result["root"].get("prefix")))
                has_mne = "mnemonic" in result and result["mnemonic"]
                has_syn = len(result.get("synonyms", [])) > 0
                markers = []
                if has_root: markers.append("🌱")
                if has_mne: markers.append("💡")
                if has_syn: markers.append("🔄")
                if result.get("collocations"): markers.append("📎")
                status = " ".join(markers) if markers else "  "
                print(f"  [{processed:4d}/{total}] {word:20s} {pct:5.1f}%  {status}")
            
        except Exception as e:
            with lock:
                enriched.append(dict(w))
                processed += 1
                pct = processed / total * 100
                print(f"  [{processed:4d}/{total}] {word:20s} ❌ {str(e)[:40]}")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        executor.map(process_one, words)
    
    # 批量分配词频等级
    enriched = batch_assign_tiers(enriched)
    n_core = sum(1 for w in enriched if w.get("frequencyTier") == "core")
    n_common = sum(1 for w in enriched if w.get("frequencyTier") == "common")
    n_adv = sum(1 for w in enriched if w.get("frequencyTier") == "advanced")
    print(f"  📊 词频分布: 核心{n_core} 常见{n_common} 进阶{n_adv}")
    
    print(f"\n💾 写入: {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=1)
    
    print(f"✅ 完成! 共处理 {len(enriched)} 个单词")
    return enriched


def count_stats(data):
    """统计丰富效果"""
    total = len(data)
    has_root = sum(1 for w in data if w.get("root") and (isinstance(w["root"], dict) and (w["root"].get("root") or isinstance(w["root"].get("root"), dict))))
    has_collocations = sum(1 for w in data if w.get("collocations"))
    has_mnemonic = sum(1 for w in data if w.get("mnemonic"))
    has_synonyms = sum(1 for w in data if w.get("synonyms") and len(w["synonyms"]) > 0)
    has_antonyms = sum(1 for w in data if w.get("antonyms") and len(w["antonyms"]) > 0)
    has_extra_examples = sum(1 for w in data if w.get("extraExamples") and len(w["extraExamples"]) > 0)
    has_tier = sum(1 for w in data if w.get("frequencyTier"))
    
    print(f"\n📊 统计:")
    print(f"  总词数:     {total}")
    print(f"  有词根:     {has_root} ({has_root/total*100:.0f}%)")
    print(f"  有搭配:     {has_collocations} ({has_collocations/total*100:.0f}%)")
    print(f"  有助记:     {has_mnemonic} ({has_mnemonic/total*100:.0f}%)")
    print(f"  有同义词:   {has_synonyms} ({has_synonyms/total*100:.0f}%)")
    print(f"  有反义词:   {has_antonyms} ({has_antonyms/total*100:.0f}%)")
    print(f"  多例句:     {has_extra_examples} ({has_extra_examples/total*100:.0f}%)")
    print(f"  有频次分级: {has_tier} ({has_tier/total*100:.0f}%)")


if __name__ == "__main__":
    import urllib.parse
    
    max_words = None
    resume = False
    use_api = False
    for arg in sys.argv[1:]:
        if arg.startswith("--max="):
            max_words = int(arg.split("=")[1])
        elif arg == "--resume":
            resume = True
        elif arg == "--test":
            max_words = 5
        elif arg == "--api":
            use_api = True
    
    src_dir = Path("src/data")
    
    for name in ["cet4", "cet6"]:
        input_path = src_dir / f"{name}.json"
        output_path = src_dir / f"{name}.json"  # Write back
        
        if not input_path.exists():
            print(f"⚠️  跳过: {input_path} 不存在")
            continue
        
        print(f"\n{'='*60}")
        print(f"  处理 {name}")
        print(f"{'='*60}")
        
        result = process_file(str(input_path), str(output_path), max_words, resume, use_api)
        count_stats(result)
    
    print(f"\n{'='*60}")
    print("  全部完成!")
    print(f"{'='*60}")
