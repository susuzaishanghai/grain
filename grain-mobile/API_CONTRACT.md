<!-- ASCII PREAMBLE: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA -->

# Grain Cloud API Contract（供应商无关）

目标：App 只依赖一套稳定的“Grain 后端 API”，你后端再去对接任意云服务供应商（识别/分割/LLM/RAG）。这样你随时更换供应商，不用改 App。

## 0) 通用约定

- Base URL：例如 `https://api.yourdomain.com`
- 版本：`/v1`
- Locale：前端传 `requestedLocale`，后端按 fallback 规则返回 `resolvedLocale`
- 错误结构（统一）：
  ```json
  { "error": { "code": "COVERAGE_MISSING", "message": "..." } }
  ```

## 1) 识别与纠错（拍照 → categoryCandidates）

### `POST /v1/identify`

上传图片，返回 Top-N 候选类目（以及可选的“贴纸/抠图”结果）。

**Request（multipart/form-data）**
- `file`: image
- `requestedLocale`: string（可选，默认 `zh`）
- `maxCandidates`: number（可选，默认 3）

**Response（200）**
```json
{
  "objectName": "鸡蛋",
  "objectGeneric": "蛋",
  "categoryCandidates": [
    { "categoryId": "food_drink", "categoryName": "食物饮品", "confidence": 0.91 }
  ],
  "sticker": {
    "type": "none",
    "stickerPngUrl": null,
    "maskPngUrl": null
  }
}
```

说明：MVP 可以先 `sticker.type = none`（不抠图），后续再升级为 `mask`/`stickerPngUrl`。

## 2) 覆盖查询（选国页动态过滤）

### `GET /v1/coverage?categoryId=food_drink`

**Response（200）**
```json
{
  "categoryId": "food_drink",
  "coveredCountries": ["FR", "JP", "CN"]
}
```

选国页用它来置灰/过滤，避免“进对话页才失败”。

## 3) 内容生成（categoryId + 两国 → 5 节点对话 + 10 张卡）

### `POST /v1/generate`

**Request（application/json）**
```json
{
  "requestedLocale": "zh",
  "categoryId": "food_drink",
  "objectName": "鸡蛋",
  "objectGeneric": "蛋",
  "countryA": "FR",
  "countryB": "JP",
  "nodeTypeIds": ["ORIGIN", "SPREAD", "RITUAL", "INDUSTRY", "MODERN"]
}
```

**Response（200）**
```json
{
  "requestedLocale": "zh",
  "resolvedLocale": "zh",
  "isFallback": false,
  "fallbackChain": ["zh"],
  "knowledgeBaseVersion": "kb-2025-01-01",
  "sessionId": "sess_abc",
  "chapters": [
    {
      "categoryId": "food_drink",
      "nodeTypeId": "ORIGIN",
      "chapterTitle": "从蛋的起点开始",
      "displayTimeLabel": "公元前 2000–1000",
      "timeRange": { "startYear": -2000, "endYear": -1000 }
    }
  ],
  "dialogues": [
    { "nodeTypeId": "ORIGIN", "countryId": "FR", "text": "..." },
    { "nodeTypeId": "ORIGIN", "countryId": "JP", "text": "..." }
  ],
  "cards": [
    {
      "cardId": "FR_ORIGIN",
      "countryId": "FR",
      "categoryId": "food_drink",
      "nodeTypeId": "ORIGIN",
      "title": "...",
      "facts": ["...", "..."],
      "keywords": ["...", "...", "..."],
      "sourceHints": [
        { "sourceHintId": "sh_1", "sourceType": "museum", "sourceName": "British Museum", "year": 2018 }
      ],
      "sensitivityTag": "none",
      "factIdsUsed": ["f1", "f2"],
      "sourceHintIdsUsed": ["sh_1"]
    }
  ]
}
```

**MVP 硬规则**
- nodeType 固定枚举：`ORIGIN / SPREAD / RITUAL / INDUSTRY / MODERN`
- 知识卡 lint：`facts>=2`、`keywords>=3`、`sourceHints>=1`
- `COVERAGE_MISSING`：必须在选国阶段被挡住（或 generate 返回该错误，前端回退到选国/纠错页）

## 4) 反馈回传（不准确/不相关）

### `POST /v1/feedback`

**Request（application/json）**
```json
{
  "cardId": "FR_ORIGIN",
  "countryId": "FR",
  "categoryId": "food_drink",
  "nodeTypeId": "ORIGIN",
  "feedbackType": "inaccurate",
  "factIdsUsed": ["f1", "f2"],
  "sourceHintIdsUsed": ["sh_1"],
  "note": "可选"
}
```

**Response（200）**
```json
{ "ok": true }
```

