# PureMemo Android 构建指南

## 方法一：在线生成 APK（推荐，不需装任何东西）

1. 把项目上传到 GitHub（见下方方法三）
2. 打开 https://pwabuilder.com
3. 输入你的 GitHub Pages 网址
4. 点 Android → Package → 下载 .apk

---

## 方法二：本地用 Android Studio 编译

### 1. 安装必要工具
- 下载安装 **Android Studio**：https://developer.android.com/studio
- 安装时勾选 **Android SDK** 和 **Android SDK Platform 34**
- 安装后打开 Android Studio → SDK Manager → 安装：
  - `Android SDK Platform 34`
  - `Android SDK Build-Tools 34`

### 2. 设置环境变量
系统环境变量添加：
```
ANDROID_HOME = C:\Users\26582\AppData\Local\Android\Sdk
```
把 `%ANDROID_HOME%\platform-tools` 和 `%ANDROID_HOME%\cmdline-tools\latest\bin` 加到 PATH

### 3. 构建 APK

```bash
cd D:\deepseek\wenjian\PureMemo

# ① 构建网页
npm run build

# ② 同步到 Android 项目
npx cap sync android

# ③ 编译 APK
cd android
gradlew assembleDebug
```

APK 生成在：`android\app\build\outputs\apk\debug\app-debug.apk`

### 4. 传到手机安装

把 `app-debug.apk` 传到手机，打开即可安装。

---

## 方法三：发布到 GitHub Pages（永久在线 + 可转 APK）

```bash
cd D:\deepseek\wenjian\PureMemo

# 初始化 git
git init
git add .
git commit -m "PureMemo 完整项目"

# 在 https://github.com/new 创建仓库后
git remote add origin https://github.com/你的用户名/purememo.git
git push -u origin main

# 构建网页
npm run build

# 把 dist 推送到 gh-pages 分支
npx gh-pages -d dist
```

之后手机打开 `https://你的用户名.github.io/purememo` → 添加到主屏幕 → 离线永久使用。
