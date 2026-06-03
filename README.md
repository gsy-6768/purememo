# PureMemo 🧠

**纯算法版墨墨背单词复刻** — 100% 离线 · 免费 · 无广告 · v1.1.0

> 基于改良版艾宾浩斯遗忘曲线的间隔重复记忆软件
> PWA 应用，手机浏览器打开即可安装到桌面，也可编译为 Android APK

---

## 🚀 启动方法

```bash
# 安装依赖
cd PureMemo
npm install

# 开发模式运行（推荐）
npm run dev
# 浏览器打开 http://localhost:5173

# 构建生产版本
npm run build
npm run preview

# 编译 Android APK
npm run build
npx cap sync android
# 然后用 Android Studio 打开 android/ 目录编译
# 或直接运行 build-apk.bat（需配置 JDK + Android SDK）
```

### 手机使用

1. 确保手机和电脑在同一个 Wi-Fi 网络
2. 运行 `npm run dev` 后，手机浏览器访问 `http://你的电脑IP:5173`
3. 用 Chrome/Safari 打开后，选择"添加到主屏幕"即可像 App 一样使用
4. 完全离线运行，无需网络

### 在线访问

https://gsy-6768.github.io/purememo/

---

## 📖 主要功能

### 🃏 四种学习模式

| 模式 | 说明 |
|:-----|:------|
| **翻卡记忆** | 看单词回想释义，卡片翻转展示词根/搭配/助记 |
| **✍️ 拼写模式** | 看释义+音标，输入单词拼写，自动判对错 |
| **🎯 选择题** | 看单词，四选一选释义（模拟真题） |
| **📝 例句填空** | 看挖空例句，填入缺失单词 |

### 🧠 核心记忆算法
- 改良版艾宾浩斯遗忘曲线，三个反馈按钮：
  - 😅 **忘记** — 重新开始，缩短间隔
  - 🤔 **模糊** — 部分记住，适度调整
  - ✅ **认识** — 延长复习间隔
- 每个单词记录完整学习历史（EF 因子、间隔、复习次数）
- 动态计算记忆持久度（指数衰减模型）

### 📎 每个单词的丰富内容
- 🌱 **词根词缀拆解** — 前缀 + 词根 + 后缀 + 同根词（覆盖率 75%+）
- 📎 **常考搭配** — 含中文翻译（覆盖率 70%+）
- 💡 **助记口诀** — 888+ 条手写词根助记
- ⭐ **词频分级** — 核心(20%) / 常见(55%) / 进阶(25%)
- 🔄 **近/反义词**
- 📖 **多条例句**

### 📊 数据可视化
- 📈 **30天学习趋势折线图** — 复习数 + 新学数
- 📊 **正确率柱状图** — 每日正确率变化
- 🍩 **掌握程度环形图** — 未学习/学习中/已掌握/已遗忘

### 🔥 用户黏性
- 连续打卡天数显示 🏆
- 每日目标进度弧形环
- 今日学习状态标记

### ⚙️ 设置
- 每日新学上限 — 快捷键 [20] [50] [100] [200] + 直接输入
- 每日复习上限
- 自动发音开关
- 深色模式切换
- 字体大小调整（小/中/大）
- 学习顺序选择

### 📚 词库管理
- 内置 CET-4（4544 词）+ CET-6（3991 词）
- 支持导入 TXT / CSV 格式
- 支持手动添加单个单词
- 支持移出单词
- ⭐ 核心词进度追踪

### 💾 数据管理
- 导出 JSON 备份
- 恢复备份
- 清除所有数据

---

## 🏗️ 技术架构

```
PureMemo/
├── src/
│   ├── algorithms/
│   │   └── spaced-repetition.js   # 核心记忆算法
│   ├── db/
│   │   └── database.js            # IndexedDB 数据库封装
│   ├── data/
│   │   ├── cet4.json              # 四级词汇（含丰富字段）
│   │   └── cet6.json              # 六级词汇（含丰富字段）
│   ├── components/
│   │   ├── HomePage.jsx           # 首页（打卡+进度+模式选择）
│   │   ├── StudyView.jsx          # 学习界面（4种模式）
│   │   ├── StudyComplete.jsx      # 学习报告
│   │   ├── SpellingMode.jsx       # 拼写模式
│   │   ├── QuizMode.jsx           # 选择题模式
│   │   ├── FillBlankMode.jsx      # 例句填空
│   │   ├── WordLibrary.jsx        # 词库管理
│   │   ├── Statistics.jsx         # 数据统计（recharts 图表）
│   │   ├── Settings.jsx           # 设置
│   │   └── NavBar.jsx             # 导航栏
│   └── utils/
│       └── tts.js                 # 发音工具
├── android/                       # Capacitor Android 项目
├── public/
│   └── icons/                     # PWA 图标
├── enrich_words.py                # 词库丰富脚本
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### 技术栈

| 技术 | 用途 |
|:-----|:------|
| React 18 + React Router 6 | 前端框架 |
| Tailwind CSS 3 | 样式 |
| IndexedDB (via idb) | 本地数据库 |
| recharts | 数据可视化图表 |
| Vite + vite-plugin-pwa | 构建 + PWA 离线支持 |
| Capacitor 8 | Android 原生壳 |
| Web Speech API | TTS 发音 |

**无后端、无 API、无广告、无数据收集**

---

## 📦 词库数据格式

每个单词包含丰富字段：

```json
{
  "word": "absorb",
  "phonetic_uk": "əb'sɔ:b",
  "phonetic_us": "æbˈsɔrb",
  "pos": "v.",
  "meaning": "v. 吸收（液体、气体等）",
  "example": "Plants absorb nutrients from the soil. — 植物从土壤中吸收养分。",
  "frequencyTier": "common",
  "collocations": ["absorb nutrients — 吸收养分"],
  "root": {
    "prefix": { "root": "ab", "meaning": "加强" },
    "root": { "root": "sorbere", "origin": "拉丁语", "meaning": "吸收",
              "related": ["absorbent", "absorbing"] }
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
dog
```
每行一个单词，程序自动识别。

### CSV 格式
```
apple,/ˈæp.l/,n.,苹果,An apple a day keeps the doctor away.
book,/bʊk/,n.,书,I read a book every week.
```
各列：`单词,音标,词性,释义,例句`

在"词库管理"页面选择学习计划后，点击"导入 TXT/CSV"按钮选择文件即可。

---

## 🔮 后续可优化方向

- [ ] 更多词库（考研/雅思/托福/GRE）
- [ ] 艾宾浩斯复习日历视图
- [ ] 学习提醒通知
- [ ] 多设备数据同步（通过本地文件）
- [ ] 自定义记忆参数（EF 调整幅度、间隔倍数等）
- [ ] 单词本分组/标签系统
- [ ] 每日一句 / 单词 Widget
- [ ] 拼写错误统计 / 易错词本

---

## 许可

MIT License — 完全免费开源
