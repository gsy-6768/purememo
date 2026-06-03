# PureMemo 🧠

**纯算法版墨墨背单词复刻** — 100% 离线 · 免费 · 无广告 · v1.1.0

> 基于改良版艾宾浩斯遗忘曲线的间隔重复记忆软件
> PWA 应用，手机浏览器打开即可安装到桌面，也可编译为 Android APK

---

## 📖 主要功能

### 🃏 四种学习模式

| 模式 | 说明 |
|:-----|:------|
| **翻卡记忆** | 看单词回想释义，卡片翻转展示词根/搭配/助记，右上角显示进度 |
| **✍️ 拼写模式** | 看释义+音标，输入单词拼写，自动判对错 |
| **🎯 选择题** | 看单词，四选一选释义（从同词库随机抽选项） |
| **📝 例句填空** | 看挖空例句，填入缺失单词，显示原例句对比 |

### 🧠 核心记忆算法
- 改良版艾宾浩斯遗忘曲线，三个反馈按钮：
  - 😅 **忘记** — 重新开始，缩短间隔
  - 🤔 **模糊** — 部分记住，适度调整
  - ✅ **认识** — 延长复习间隔
- 每个单词记录完整学习历史（EF 因子、间隔、复习次数、正确/模糊/忘记次数）
- 动态计算记忆持久度（指数衰减模型）
- 支持自定义记忆参数（设置页可调 EF 惩罚/奖励、间隔倍率、最大间隔上限）

### 📎 每个单词的丰富内容
- 🌱 **词根词缀拆解** — 前缀 + 词根 + 后缀 + 同根词（覆盖率 75%+）
- 📎 **常考搭配** — 含中文翻译（覆盖率 70%+）
- 💡 **助记口诀** — 888+ 条手写词根助记 + 自动生成
- ⭐ **词频分级** — 核心(20%) / 常见(55%) / 进阶(25%)
- 📖 **多条例句**
- 翻卡背面同时展示词根拆解、搭配、助记、同根词

### 📊 统计与可视化
- 📈 **30 天学习趋势折线图** — 复习数 + 新学数双线
- 📊 **正确率柱状图** — 每日正确率变化
- 🍩 **掌握程度环形图** — 未学习/学习中/已掌握/已遗忘
- 🗓️ **复习日历** — 月历模式，色点标记每日复习量
- 📉 **易错词检测** — 连续忘记≥2 次或忘记+模糊≥40% 自动标记

### 🔥 用户黏性
- 连续打卡天数显示 🏆
- 每日目标进度弧形环（SVG 动画）
- 10 个成就系统（青铜/白银/黄金三档）
- 今日学习状态实时更新（每学一词即记录）

### 🔍 全局搜索
- 跨 CET-4 / CET-6 实时搜索
- 搜索结果按词频和词库排序
- 点击单词弹出详情浮窗（含词根/搭配/助记/例句）
- 搜索结果直接点击「学习」→ 详情浮窗

### 🌿 词根字典
- 81 个词根，映射 4885 个单词
- 按来源语言分类（拉丁语/希腊语）
- 搜索过滤 + 展开词根单词列表

### 📖 沉浸式阅读
- 8 篇 CET 级别精选短文
- 文中 CET 单词高亮标记（颜色按词频分级）
- 点击高亮单词弹出释义卡片
- 标记「加入今日学习」

### ⚙️ 设置
- 每日新学上限（快捷按钮 + 直接输入）
- 每日复习上限
- 自动发音开关 + 语速调节
- 深色模式切换
- 字体大小调整（小/中/大）
- 学习顺序（顺序/随机/先新后旧/先旧后新）
- 自定义记忆参数（初始 EF、EF 惩罚/奖励、间隔系数、最大间隔）

### 📚 词库管理
- 内置 CET-4（4544 词）+ CET-6（3991 词）
- 支持导入 TXT / CSV 格式
- 支持手动添加单个单词
- 支持移出单词
- ⭐ 核心词进度追踪
- 学习计划暂停/删除

### 💾 数据管理
- 导出 JSON 备份
- 恢复备份
- 清除所有数据

---

## 🚀 启动方法

### 开发模式
```bash
npm install
npm run dev
# 浏览器打开 http://localhost:5173
```

### 手机预览（局域网）
1. 手机和电脑在同一 Wi-Fi
2. `npm run dev` → 手机浏览器访问 `http://电脑IP:5173`
3. Chrome/Safari → 添加到主屏幕 → 像 App 一样使用
4. 完全离线运行

### 在线访问
https://gsy-6768.github.io/purememo/

### 构建生产版本
```bash
npm run build
npm run preview
```

### 编译 Android APK
```bash
npm run build
npx cap sync android
# 然后用 Android Studio 打开 android/ 目录编译
# 或直接运行 build-apk.bat（需配置 JDK 17+ + Android SDK 34）
```

APK 路径: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🏗️ 技术架构

```
PureMemo/
├── src/
│   ├── algorithms/
│   │   └── spaced-repetition.js   # 核心记忆算法
│   ├── db/
│   │   ├── database.js            # IndexedDB 数据库封装
│   │   └── achievements.js        # 成就系统逻辑
│   ├── components/
│   │   ├── HomePage.jsx           # 首页（打卡+进度环+计划卡片+模式选择）
│   │   ├── StudyView.jsx          # 学习界面（4种模式合一）
│   │   ├── StudyComplete.jsx      # 学习完成报告页
│   │   ├── GlobalSearch.jsx       # 全局搜索（跨词库）
│   │   ├── RootExplorer.jsx       # 词根字典页面
│   │   ├── ReadingView.jsx        # 沉浸式阅读
│   │   ├── Statistics.jsx         # 数据统计（recharts 图表 + 复习日历）
│   │   ├── Settings.jsx           # 设置（含记忆参数微调）
│   │   ├── WordLibrary.jsx        # 词库管理
│   │   ├── Achievements.jsx       # 成就展示页
│   │   ├── Skeleton.jsx           # 骨架屏加载
│   │   ├── Toast.jsx              # Toast 通知系统
│   │   └── NavBar.jsx             # 底部导航栏（可滑动）
│   └── utils/
│       └── tts.js                 # 发音工具（@capacitor-community/text-to-speech）
├── android/                       # Capacitor Android 项目
├── public/
│   └── icons/                     # PWA 图标
├── enrich_words.py                # 词库丰富脚本（词根/搭配/助记）
├── build-apk.bat                  # 一键编译 APK 脚本
├── cap-sync-android.bat           # Capacitor 同步脚本
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### 技术栈

| 技术 | 用途 |
|:-----|:------|
| React 18 + React Router 6 | 前端框架（React.lazy 代码分割） |
| Tailwind CSS 3 | 样式 |
| IndexedDB (via idb) | 本地离线数据库 |
| recharts | 数据可视化图表 |
| Vite + vite-plugin-pwa | 构建 + PWA Service Worker 离线缓存 |
| Capacitor 8 | Android 原生壳 |
| @capacitor-community/text-to-speech | 本地 TTS 发音 |
| Web Speech API | 浏览器端 TTS 备用 |

**无后端、无 API、无广告、无数据收集、100% 离线**

---

## 📦 词库数据格式

每个单词包含丰富字段：

```json
{
  "word": "absorb",
  "phonetic_uk": "əbˈsɔːb",
  "phonetic_us": "æbˈsɔːrb",
  "pos": "v.",
  "meaning": "v. 吸收（液体、气体等）；吸引（注意力）",
  "example": "Plants absorb nutrients from the soil.",
  "frequencyTier": "common",
  "collocations": [
    "absorb nutrients — 吸收养分",
    "absorb moisture — 吸收水分"
  ],
  "root": {
    "prefix": { "root": "ab", "meaning": "加强" },
    "root": { "root": "sorbere", "origin": "拉丁语", "meaning": "吸收",
              "related": ["absorbent", "absorbing", "absorption"] },
    "suffix": null
  },
  "mnemonic": "ab(加强) + sorbere(吸收) → 吸收",
  "synonyms": ["assimilate", "incorporate"],
  "extraExamples": ["Heat, light, and electricity are absorbed..."]
}
```

---

## 📥 如何导入自定义词库

### TXT 格式
```
apple
banana
cat
```
每行一个单词，程序自动识别。

### CSV 格式
```
apple,/ˈæp.l/,n.,苹果,An apple a day keeps the doctor away.
book,/bʊk/,n.,书,I read a book every week.
```
各列：`单词,音标,词性,释义,例句`

在"词库管理"页面 → 选择学习计划 → 点击"导入 TXT/CSV" → 选择文件。

---

## 📝 许可

MIT License — 完全免费开源
