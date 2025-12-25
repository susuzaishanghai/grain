# Grain Mobile（MVP）

这是一个用 Expo React Native 做的 iOS/Android MVP：拍照（或示例）→ 选两国对照 → 5 个时间节点对话 → 知识卡（收藏/学习进度本地保存）。

## 1) 开发运行（Expo Go）

1. 进入目录：`cd e:\项目\1\grain-mobile`
2. 安装依赖（装过可跳过）：`npm install`
3. 启动：`npm run start`
4. 真机打开（推荐）：手机装 **Expo Go** → 与电脑同一网络 → 扫二维码打开

App 内路径：拍照页点“拍照/示例” → 选国家 → 对话 → 卡片 → 详情页（停留/滚动触发学习计数）→ “我的”里看收藏/日历/地图。

## 2) 生成可安装包（Android / iOS）

现在工程里是**源码**，所以看起来步骤多；但你要的“正常安装包”就是 `apk`，产出 APK 需要先构建一次。

### A. Android（推荐）：EAS 云构建拿到 APK（最少步骤）

前置：需要 Expo 账号（只做一次）。

0. 确认在项目目录里执行（否则会报 “Run this command inside a project directory.”）：`cd e:\项目\1\grain-mobile`
1. 改包名（只做一次）：打开 `grain-mobile/app.json`，把 `expo.android.package` 改成你的唯一标识（例如 `com.yourname.grain`）
2. 登录（只做一次）：`npx eas-cli login`
3. 出 APK（以后每次就这一条）：`npx eas-cli build -p android --profile preview`

构建完成后 EAS 会给 APK 下载链接；下载后就能直接安装/转发给别人安装（不需要 Expo Go）。

### B. 本地构建（Android）

需要你本机安装 Android Studio/SDK/JDK，流程是：

1. `npx expo prebuild`
2. `npx expo run:android --variant release`

Note: If you see `adb executable doesn't seem to work` / `spawn adb ENOENT`, it means `adb` is missing on your PC, so EAS cannot auto-install to an emulator. The APK is already built — install it from the EAS link on your Android phone, or install Android SDK Platform-Tools to get `adb`.

（iOS 本地构建需要 macOS + Xcode）

## 2.1) 云端 API（你后续换哪家都行）

我先把“供应商无关”的接口合同整理好了：`grain-mobile/API_CONTRACT.md`  
你后续想接哪家（识别/分割/LLM/RAG）都在你自己的后端里换，不改 App。

## 3) 内容与规则在哪里改

- 示例内容（对话/章节标题/知识卡）：`grain-mobile/src/data/demoContent.ts`
- 学习进度口径：详情页停留/滚动阈值在 `grain-mobile/src/screens/CardDetailScreen.tsx`
- 收藏/进度存储：`grain-mobile/src/state/AppState.tsx`

## 4) 你说的“正常 App 的 2) 功能”

当前版本是“可跑通闭环 + 内置示例内容”的 MVP。要做到你说的“识别/抠图/RAG/多国家”，建议分两步推进：

1. **先把“识别与纠错”产品链路做完整**：拍照后给 Top-3 候选 + 手动选类目/物体（先不依赖真识别，也能把交互跑通）。
2. **再接真实识别与抠图**（两条路线二选一）：
   - 云端识别/分割：最快，但需要后端与隐私策略（上传裁剪图/低分辨率等）
   - 端上模型（TFLite/ML Kit）：更“真 App”，但需要引入原生能力（Dev Client/Prebuild），工程量更大

如果你确认要走哪条路线（云端 vs 端上），我可以把下一步的工程改造（依赖、目录、接口、缓存、兜底）直接落到代码里。
