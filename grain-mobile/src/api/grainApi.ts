/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { ChapterMeta, KnowledgeCard, NodeTypeId } from '../types';

export type RuntimeApiConfig = {
  enabled: boolean;
  kind: 'grain_backend' | 'openai_compatible';
  baseUrl: string;
  apiKey: string;
  openaiModel?: string;
  openaiVisionModel?: string;
};

let runtimeApiConfig: RuntimeApiConfig | null = null;

export function setRuntimeApiConfig(config: RuntimeApiConfig | null) {
  runtimeApiConfig = config;
}

function trimSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function joinV1(baseUrl: string, pathAfterV1: string): string {
  const base = trimSlashes(baseUrl.trim());
  const after = pathAfterV1.replace(/^\/+/, '');
  if (!base) return `/${after}`;
  if (base.toLowerCase().endsWith('/v1')) return `${base}/${after}`;
  return `${base}/v1/${after}`;
}

export type GrainApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'COVERAGE_MISSING'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type GrainApiError = {
  error: {
    code: GrainApiErrorCode | string;
    message: string;
  };
};

export type IdentifyCategoryCandidate = {
  categoryId: string;
  categoryName: string;
  confidence?: number;
};

export type IdentifyResponse = {
  objectName: string;
  objectGeneric: string;
  categoryCandidates: IdentifyCategoryCandidate[];
  sticker?: {
    type: 'none' | 'mask' | 'sticker';
    stickerPngUrl?: string | null;
    maskPngUrl?: string | null;
  };
};

export type CoverageResponse = {
  categoryId: string;
  coveredCountries: string[];
};

export type GenerateRequest = {
  requestedLocale: string;
  categoryId: string;
  objectName: string;
  objectGeneric: string;
  countryA: string;
  countryB: string;
  nodeTypeIds: NodeTypeId[];
};

export type GenerateResponse = {
  requestedLocale: string;
  resolvedLocale: string;
  isFallback: boolean;
  fallbackChain?: string[];
  knowledgeBaseVersion?: string;
  sessionId: string;
  chapters: ChapterMeta[];
  dialogues: Array<{ nodeTypeId: NodeTypeId; countryId: string; text: string }>;
  cards: KnowledgeCard[];
};

export type FeedbackRequest = {
  cardId: string;
  countryId: string;
  categoryId: string;
  nodeTypeId: NodeTypeId;
  feedbackType: 'inaccurate' | 'irrelevant' | 'other';
  factIdsUsed: string[];
  sourceHintIdsUsed: string[];
  note?: string;
};

export function getGrainApiBaseUrl(): string | null {
  const raw = runtimeApiConfig
    ? runtimeApiConfig.enabled
      ? runtimeApiConfig.baseUrl
      : null
    : process.env.EXPO_PUBLIC_GRAIN_API_BASE_URL;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimSlashes(trimmed);
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = runtimeApiConfig
    ? runtimeApiConfig.enabled
      ? runtimeApiConfig.apiKey
      : ''
    : process.env.EXPO_PUBLIC_GRAIN_API_KEY;
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (res.ok) return json as T;

  const message = (json as GrainApiError | null)?.error?.message ?? `HTTP ${res.status}`;
  const code = (json as GrainApiError | null)?.error?.code ?? `HTTP_${res.status}`;
  const err = new Error(message) as Error & { code?: string; status?: number; payload?: unknown };
  err.code = String(code);
  err.status = res.status;
  err.payload = json;
  throw err;
}

async function parseJsonOrThrowStrict<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e: any) {
    const err = new Error(
      `NON_JSON_RESPONSE: ${typeof e?.message === 'string' ? e.message : 'invalid json'}`
    ) as Error & { status?: number; payloadText?: string };
    err.status = res.status;
    err.payloadText = text.slice(0, 400);
    throw err;
  }

  if (!res.ok) {
    const message = (json as GrainApiError | null)?.error?.message ?? `HTTP ${res.status}`;
    const code = (json as GrainApiError | null)?.error?.code ?? `HTTP_${res.status}`;
    const err = new Error(message) as Error & { code?: string; status?: number; payload?: unknown };
    err.code = String(code);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  if (json === null || json === undefined) {
    const err = new Error('NON_JSON_RESPONSE: empty body') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return json as T;
}

export async function identifyImage(params: {
  photoUri: string;
  requestedLocale?: string;
  maxCandidates?: number;
}): Promise<IdentifyResponse> {
  const baseUrl = getGrainApiBaseUrl();
  if (!baseUrl) throw new Error('GRAIN_API_NOT_CONFIGURED');

  const form = new FormData();
  form.append('file', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uri: params.photoUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as any);
  if (params.requestedLocale) form.append('requestedLocale', params.requestedLocale);
  if (params.maxCandidates) form.append('maxCandidates', String(params.maxCandidates));

  const res = await fetch(joinV1(baseUrl, 'identify'), { method: 'POST', headers: getHeaders(), body: form });
  return parseJsonOrThrow<IdentifyResponse>(res);
}

export async function fetchCoverage(params: { categoryId: string }): Promise<CoverageResponse> {
  const baseUrl = getGrainApiBaseUrl();
  if (!baseUrl) throw new Error('GRAIN_API_NOT_CONFIGURED');
  const url = `${joinV1(baseUrl, 'coverage')}?categoryId=${encodeURIComponent(params.categoryId)}`;
  const res = await fetch(url, { headers: getHeaders() });
  return parseJsonOrThrow<CoverageResponse>(res);
}

export async function generateContent(req: GenerateRequest): Promise<GenerateResponse> {
  const baseUrl = getGrainApiBaseUrl();
  if (!baseUrl) throw new Error('GRAIN_API_NOT_CONFIGURED');
  const res = await fetch(joinV1(baseUrl, 'generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(req),
  });
  return parseJsonOrThrow<GenerateResponse>(res);
}

export async function submitFeedback(req: FeedbackRequest): Promise<{ ok: boolean }> {
  const baseUrl = getGrainApiBaseUrl();
  if (!baseUrl) throw new Error('GRAIN_API_NOT_CONFIGURED');
  const res = await fetch(joinV1(baseUrl, 'feedback'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(req),
  });
  return parseJsonOrThrow<{ ok: boolean }>(res);
}

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
    };
  }>;
  error?: { message?: string };
};

function repairJsonText(text: string): string {
  let t = text.trim();
  t = t.replace(/\uFEFF/g, '');
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  t = t.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
  t = t.replace(/,\s*([}\]])/g, '$1');
  t = t.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
  t = t.replace(/:\s*None\b/g, ': null').replace(/:\s*True\b/g, ': true').replace(/:\s*False\b/g, ': false');
  t = t.replace(/:\s*undefined\b/g, ': null');

  t = t.replace(/:\s*([^,\}\]]+)(\s*)(?=[,\}\]])/g, (m, raw, ws) => {
    const v = String(raw).trim();
    if (!v) return m;
    if (v.startsWith('"') || v.startsWith("'") || v.startsWith('{') || v.startsWith('[')) return `: ${v}${ws}`;
    if (v === 'true' || v === 'false' || v === 'null') return `: ${v}${ws}`;
    if (/^-?\d+(?:\.\d+)?$/.test(v)) return `: ${v}${ws}`;
    const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `: "${escaped}"${ws}`;
  });

  return t;
}

function stripCodeFences(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
}

function findJsonStart(text: string): number {
  const obj = text.indexOf('{');
  const arr = text.indexOf('[');
  if (obj === -1) return arr;
  if (arr === -1) return obj;
  return Math.min(obj, arr);
}

function extractFirstCompleteJson(text: string): string | null {
  const start = findJsonStart(text);
  if (start === -1) return null;

  let inString: '"' | "'" | null = null;
  let escaped = false;
  const stack: Array<'{' | '['> = [];

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      if (stack.length > 0) {
        stack.pop();
        if (stack.length === 0) return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function autoCloseJson(text: string): string {
  let inString: '"' | "'" | null = null;
  let escaped = false;
  const stack: Array<'{' | '['> = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      if (stack.length > 0) stack.pop();
    }
  }

  let out = text;
  if (inString) {
    // If the last char was an escape, close the escape first so the next quote can close the string.
    if (escaped) out += inString;
    out += inString;
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    out += stack[i] === '{' ? '}' : ']';
  }
  return out;
}

function parseJsonBestEffort(text: string): unknown {
  const candidates = [
    text,
    repairJsonText(text),
    autoCloseJson(text),
    repairJsonText(autoCloseJson(text)),
    autoCloseJson(repairJsonText(text)),
  ];

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function extractJsonFromText(text: string): unknown {
  const cleaned = stripCodeFences(text).trim();
  const start = findJsonStart(cleaned);
  if (start === -1) throw new Error('MODEL_OUTPUT_NOT_JSON');

  const maybeComplete = extractFirstCompleteJson(cleaned.slice(start));
  const candidate = (maybeComplete ?? cleaned.slice(start)).trim();

  try {
    return parseJsonBestEffort(candidate);
  } catch (e: any) {
    const head = cleaned.slice(0, 220);
    throw new Error(
      `MODEL_OUTPUT_NOT_VALID_JSON: ${typeof e?.message === 'string' ? e.message : 'parse failed'} | head=${head}`
    );
  }
}

function normalizeSourceHints(card: any): any[] {
  const sourceHints = Array.isArray(card?.sourceHints) ? card.sourceHints : [];
  return sourceHints.map((s: any, idx: number) => ({
    sourceHintId: String(s?.sourceHintId ?? `sh_${idx + 1}`),
    sourceType: String(s?.sourceType ?? 'other'),
    sourceName: String(s?.sourceName ?? 'unknown'),
    year: typeof s?.year === 'number' ? s.year : undefined,
    note: typeof s?.note === 'string' ? s.note : undefined,
  }));
}

function coerceGenerateResponse(value: any, requestedLocale: string): GenerateResponse {
  const sessionId = String(value?.sessionId ?? `sess_${Date.now()}`);
  const chapters = Array.isArray(value?.chapters) ? value.chapters : [];
  const dialogues = Array.isArray(value?.dialogues) ? value.dialogues : [];
  const cards = Array.isArray(value?.cards) ? value.cards : [];

  return {
    requestedLocale,
    resolvedLocale: String(value?.resolvedLocale ?? requestedLocale),
    isFallback: Boolean(value?.isFallback ?? false),
    fallbackChain: Array.isArray(value?.fallbackChain) ? value.fallbackChain.map(String) : undefined,
    knowledgeBaseVersion: typeof value?.knowledgeBaseVersion === 'string' ? value.knowledgeBaseVersion : undefined,
    sessionId,
    chapters: chapters.map((c: any) => ({
      categoryId: String(c?.categoryId ?? ''),
      nodeTypeId: c?.nodeTypeId as NodeTypeId,
      chapterTitle: String(c?.chapterTitle ?? ''),
      chapterSubtitle: typeof c?.chapterSubtitle === 'string' ? c.chapterSubtitle : undefined,
      chapterTone: c?.chapterTone,
      displayTimeLabel: String(c?.displayTimeLabel ?? ''),
      timeRange: c?.timeRange ?? null,
    })),
    dialogues: dialogues.map((d: any) => ({
      nodeTypeId: d?.nodeTypeId as NodeTypeId,
      countryId: String(d?.countryId ?? ''),
      text: String(d?.text ?? ''),
    })),
    cards: cards.map((card: any) => ({
      cardId: String(card?.cardId ?? ''),
      countryId: String(card?.countryId ?? ''),
      categoryId: String(card?.categoryId ?? ''),
      nodeTypeId: card?.nodeTypeId as NodeTypeId,
      title: String(card?.title ?? ''),
      facts: Array.isArray(card?.facts) ? card.facts.map(String) : [],
      keywords: Array.isArray(card?.keywords) ? card.keywords.map(String) : [],
      sourceHints: normalizeSourceHints(card),
      sensitivityTag: (card?.sensitivityTag as any) ?? 'none',
      factIdsUsed: Array.isArray(card?.factIdsUsed) ? card.factIdsUsed.map(String) : [],
      sourceHintIdsUsed: Array.isArray(card?.sourceHintIdsUsed) ? card.sourceHintIdsUsed.map(String) : [],
      knowledgeBaseVersion:
        typeof card?.knowledgeBaseVersion === 'string' ? card.knowledgeBaseVersion : undefined,
      retrievalQueryHash: typeof card?.retrievalQueryHash === 'string' ? card.retrievalQueryHash : undefined,
    })),
  };
}

export async function testOpenAiCompatibleConnection(params: { baseUrl: string; apiKey: string; model: string }) {
  const url = joinV1(params.baseUrl, 'chat/completions');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,
      messages: [{ role: 'user', content: 'ping' }],
      temperature: 0,
      max_tokens: 8,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

function coerceIdentifyResponse(value: any): IdentifyResponse {
  const raw = Array.isArray(value?.categoryCandidates)
    ? value.categoryCandidates
    : Array.isArray(value?.candidates)
      ? value.candidates
      : [];

  return {
    objectName: String(value?.objectName ?? ''),
    objectGeneric: String(value?.objectGeneric ?? ''),
    categoryCandidates: raw
      .map((c: any) => ({
        categoryId: String(c?.categoryId ?? ''),
        categoryName: String(c?.categoryName ?? ''),
        confidence: typeof c?.confidence === 'number' ? c.confidence : undefined,
      }))
      .filter((c: IdentifyCategoryCandidate) => Boolean(c.categoryId)),
  };
}

export async function identifyImageWithOpenAiCompatible(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  imageBase64: string;
  requestedLocale?: string;
  categories: Array<{ id: string; name: string }>;
}): Promise<IdentifyResponse> {
  const url = joinV1(params.baseUrl, 'chat/completions');
  const requestedLocale = params.requestedLocale ?? 'zh';
  const imageUrl = params.imageBase64.startsWith('data:')
    ? params.imageBase64
    : `data:image/jpeg;base64,${params.imageBase64}`;

  const schemaHint = `Return JSON only (no Markdown). Schema:
{ "objectName": string, "objectGeneric": string, "categoryCandidates": [{ "categoryId": string, "categoryName": string, "confidence": number }] }
Rules:
- categoryId MUST be one of the allowed categories below.
- Return up to 3 candidates, sorted by confidence desc (0..1).
- objectName/objectGeneric should be in locale: ${requestedLocale}.`;

  const allowed = params.categories.map((c) => ({ id: c.id, name: c.name }));
  const userPrompt = {
    task: 'identify_object_and_classify',
    locale: requestedLocale,
    allowedCategories: allowed,
  };

  const bodyBase = {
    model: params.model,
    temperature: 0,
    max_tokens: 500,
    messages: [
      { role: 'system', content: 'You are an API and must return strict JSON only.' },
      { role: 'system', content: schemaHint },
      {
        role: 'user',
        content: [
          { type: 'text', text: JSON.stringify(userPrompt) },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  };

  const call = async (withResponseFormat: boolean) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${params.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(withResponseFormat ? { ...bodyBase, response_format: { type: 'json_object' } } : bodyBase),
    });
    return parseJsonOrThrowStrict<OpenAIChatCompletionResponse>(res);
  };

  let json: OpenAIChatCompletionResponse;
  try {
    json = await call(true);
  } catch (e: any) {
    if (e?.status === 400 || e?.status === 422) {
      json = await call(false);
    } else {
      throw e;
    }
  }

  const toolArgs = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  const content = toolArgs ?? json.choices?.[0]?.message?.content;
  if (!content) throw new Error('MODEL_EMPTY_RESPONSE');
  const parsed = extractJsonFromText(content);
  return coerceIdentifyResponse(parsed);
}

export async function generateContentWithOpenAiCompatible(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  req: GenerateRequest;
}): Promise<GenerateResponse> {
  const url = joinV1(params.baseUrl, 'chat/completions');
  const expectedChapters = params.req.nodeTypeIds.length;
  const expectedPairs = expectedChapters * 2;

  const schemaHint = `返回严格 JSON（不要 Markdown）。必须包含：requestedLocale,resolvedLocale,isFallback,fallbackChain?,knowledgeBaseVersion?,sessionId,chapters[],dialogues[],cards[]。
chapters[]: {categoryId,nodeTypeId,chapterTitle,displayTimeLabel,timeRange?}
dialogues[]: {nodeTypeId,countryId,text}
cards[]: {cardId,countryId,categoryId,nodeTypeId,title,facts[],keywords[],sourceHints[],sensitivityTag,factIdsUsed[],sourceHintIdsUsed[]}
sourceHints[]: {sourceHintId,sourceType,sourceName,year?,note?}
约束：facts>=2; keywords>=3; sourceHints>=1; nodeTypeId 仅允许 ORIGIN/SPREAD/RITUAL/INDUSTRY/MODERN。`;

  const userPrompt = {
    requestedLocale: params.req.requestedLocale,
    categoryId: params.req.categoryId,
    objectName: params.req.objectName,
    objectGeneric: params.req.objectGeneric,
    countryA: params.req.countryA,
    countryB: params.req.countryB,
    nodeTypeIds: params.req.nodeTypeIds,
    rules: {
      cardIdFormat: '{countryId}_{nodeTypeId}',
      chapterTitleSharedPerNode: true,
      sources: '每卡至少 1 条来源线索；不确定时用弱断言并标记 disputed。',
    },
  };

  const strictOutputHint = `硬规则：
- countryId 只能是 "${params.req.countryA}" 或 "${params.req.countryB}"（用代码，不要国家中文/英文名）。
- chapters 必须输出 ${expectedChapters} 条（每 nodeTypeId 1 条）。
- dialogues 必须输出 ${expectedPairs} 条（nodeTypeId × 两国）。
- cards 必须输出 ${expectedPairs} 张（nodeTypeId × 两国）。`;

  const shortnessHint = `为避免输出被截断：
- dialogue 每条尽量 1 句，<=80 字；
- facts 只写 2 条短句；keywords 3 个；sourceHints 1 条；
- 尽量输出紧凑 JSON（少换行/少空格）。`;

  const compactHint = `如果需要重试：进一步压缩：
- chapterTitle<=14字；displayTimeLabel<=20字；
- facts=2（每条<=50字）；keywords=3（每个<=10字）；sourceHints=1；
- 输出 minified JSON（不换行/不缩进）。`;

  const callOnce = async (opts: { maxTokens: number; compact: boolean }): Promise<GenerateResponse> => {
    const messages: any[] = [
      { role: 'system', content: '你是一个后端服务，只能返回严格 JSON。' },
      { role: 'system', content: schemaHint },
      { role: 'system', content: strictOutputHint },
      { role: 'system', content: shortnessHint },
      ...(opts.compact ? [{ role: 'system', content: compactHint }] : []),
      { role: 'user', content: JSON.stringify(userPrompt) },
    ];

    const bodyBase = {
      model: params.model,
      temperature: 0,
      max_tokens: opts.maxTokens,
      messages,
    };

    const callRaw = async (withResponseFormat: boolean) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${params.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          withResponseFormat ? { ...bodyBase, response_format: { type: 'json_object' } } : bodyBase
        ),
      });
      return parseJsonOrThrowStrict<OpenAIChatCompletionResponse>(res);
    };

    let json: OpenAIChatCompletionResponse;
    try {
      json = await callRaw(true);
    } catch (e: any) {
      if (e?.status === 400 || e?.status === 422) {
        json = await callRaw(false);
      } else {
        throw e;
      }
    }

    const toolArgs = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const content = toolArgs ?? json.choices?.[0]?.message?.content;
    if (!content) throw new Error('MODEL_EMPTY_RESPONSE');
    const parsed = extractJsonFromText(content);
    return coerceGenerateResponse(parsed, params.req.requestedLocale);
  };

  const score = (r: GenerateResponse) => r.chapters.length * 1000 + r.dialogues.length * 10 + r.cards.length;
  const isCompleteEnough = (r: GenerateResponse) =>
    r.chapters.length >= expectedChapters && r.dialogues.length >= expectedPairs && r.cards.length >= expectedPairs;

  let best: GenerateResponse | null = null;
  let lastError: unknown = null;

  for (const attempt of [
    { compact: false, maxTokens: 2600 },
    { compact: true, maxTokens: 2600 },
  ]) {
    try {
      const res = await callOnce(attempt);
      if (!best || score(res) > score(best)) best = res;
      if (isCompleteEnough(res)) return res;
    } catch (e) {
      lastError = e;
    }
  }

  if (best) return best;
  throw lastError instanceof Error ? lastError : new Error('MODEL_OUTPUT_NOT_VALID_JSON');
}
