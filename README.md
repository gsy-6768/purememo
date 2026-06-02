# PureMemo 🧠

**纯算法版墨墨背单词复刻** — 100% 离线 · 免费 · 无广告

> 基于改良版艾宾浩斯遗忘曲线的间隔重复记忆软件
> PWA 应用，手机浏览器打开即可安装到桌面

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
```

### 手机使用

1. 确保手机和电脑在同一个 Wi-Fi 网络
2. 运行 `npm run dev` 后，手机浏览器访问 `http://你的电脑IP:5173`
3. 用 Chrome/Safari 打开后，选择"添加到主屏幕"即可像 App 一样使用
4. 完全离线运行，无需网络

---

## 📖 主要功能

### 核心记忆算法
- 改良版艾宾浩斯遗忘曲线，三个反馈按钮：
  - 😅 **忘记** — 重新开始，缩短间隔
  - 🤔 **模糊** — 部分记住，适度调整
  - ✅ **认识** — 延长复习间隔
- 每个单词记录完整学习历史
- 动态计算记忆持久度

### 学习界面
- 卡片翻转式学习（点击或空格翻转）
- 显示英式/美式音标
- 内置 TTS 发音（支持英式/美式）
- 键盘快捷键：1=忘记 2=模糊 3=认识
- 实时进度条显示
- 学习完成后展示详细报告

### 词库管理
- 内置大学英语四级、六级词汇
- 支持导入 TXT 格式（每行一个单词）
- 支持导入 CSV 格式（单词,音标,词性,释义,例句）
- 支持手动添加单个单词
- 支持移出已掌握单词

### 数据统计
- 每日学习记录（最近 30 天）
- 单词掌握程度分布（环形图）
- 未学习/学习中/已掌握/已遗忘 分类统计
- 支持导出备份 / 恢复备份

### 设置
- 每日新学单词上限（5-100）
- 每日复习上限（20-500）
- 自动发音开关
- 深色模式切换
- 字体大小调整（小/中/大）
- 学习顺序选择

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

## 💾 如何备份和恢复数据

在"统计"页面的"数据管理"标签下：

- **导出备份** — 下载一个 JSON 文件，包含所有学习数据
- **恢复备份** — 选择之前导出的 JSON 文件恢复
- **清除所有数据** — ⚠️ 危险操作，不可恢复

建议定期导出备份到安全位置。

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
│   │   ├── cet4.json              # 四级词汇
│   │   └── cet6.json              # 六级词汇
│   ├── components/
│   │   ├── HomePage.jsx           # 首页
│   │   ├── StudyView.jsx          # 学习界面
│   │   ├── StudyComplete.jsx      # 学习报告
│   │   ├── WordLibrary.jsx        # 词库管理
│   │   ├── Statistics.jsx         # 数据统计
│   │   ├── Settings.jsx           # 设置
│   │   └── NavBar.jsx             # 导航栏
│   └── utils/
│       └── tts.js                 # 发音工具
├── public/
│   └── icons/                     # PWA 图标
├── package.json
├── vite.config.js
└── tailwind.config.js
```

- **前端框架**: React 18 + React Router 6
- **样式**: Tailwind CSS 3
- **数据库**: IndexedDB（via idb 库）
- **PWA**: vite-plugin-pwa（Service Worker + manifest）
- **发音**: Web Speech API（系统 TTS）
- **无后端、无 API、无广告、无数据收集**

---

## 🔮 后续可优化方向

- [ ] 完整词库（考研/雅思/托福/GRE）
- [ ] 例句发音
- [ ] 拼写模式（输入单词拼写）
- [ ] 艾宾浩斯复习日历视图
- [ ] 学习提醒通知
- [ ] 多设备数据同步（通过本地文件）
- [ ] 更丰富的图表（recharts 已安装但暂未使用）
- [ ] 自定义记忆参数（EF 调整幅度、间隔倍数等）
- [ ] 单词本分组/标签系统
- [ ] 每日一句 / 单词 Widget

---

## 许可

MIT License — 完全免费开源
