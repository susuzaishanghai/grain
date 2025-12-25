export function humanizeCloudError(e: unknown): string {
  const anyErr = e as any;
  const rawMsg = typeof anyErr?.message === 'string' ? anyErr.message : '';
  const status = typeof anyErr?.status === 'number' ? anyErr.status : undefined;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;

  const combined = `${code ?? ''} ${rawMsg}`.trim();
  const has = (re: RegExp) => re.test(combined);

  if (status === 401 || has(/HTTP 401|UNAUTHORIZED|invalid api key|api key/i)) {
    return '鉴权失败：API Key/Token 不正确或无权限，请检查 Base URL 与 Key。';
  }

  if (status === 404 || has(/HTTP 404|NOT_FOUND/i)) {
    return '接口地址 404：Base URL 可能填错。请确保填到 OpenAI 兼容的 /v1（例如 https://dashscope.aliyuncs.com/compatible-mode/v1）。';
  }

  if (status === 429 || has(/HTTP 429|RATE_LIMIT|rate limit|Too Many Requests/i)) {
    return '触发限流/额度不足：请稍后重试，或检查账户额度与 QPS 限制。';
  }

  if (has(/NON_JSON_RESPONSE/i)) {
    return '接口返回的不是 JSON（可能是网关/HTML）。请检查 Base URL 是否直达 OpenAI 兼容接口。';
  }

  if (has(/MODEL_OUTPUT_NOT_JSON/i)) {
    return '模型没有按要求返回 JSON。建议更换文本模型或重试。';
  }

  if (has(/MODEL_OUTPUT_NOT_VALID_JSON/i)) {
    if (has(/Unexpected end of input|Unexpected end of JSON input/i)) {
      return '模型输出被截断（不完整 JSON）。建议换更强文本模型（如 qwen-plus/qwen-max）或重试。';
    }
    return '模型输出不是有效 JSON。建议更换文本模型或重试。';
  }

  if (rawMsg.length > 240) return `${rawMsg.slice(0, 240)}…`;
  return rawMsg || '请稍后重试';
}

