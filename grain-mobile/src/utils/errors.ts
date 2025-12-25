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
    return '接口地址 404：该 Base URL/供应商可能不支持当前接口路径（例如 OpenAI 生图需要 `/v1/images/generations`）。如你在用 DashScope，请在“API 设置→配图”把生图接口类型切到“DashScope 万相”。';
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

  if (has(/MODEL_EMPTY_IMAGE|IMAGE_EMPTY_RESPONSE/i)) {
    return '生图服务未返回图片数据，请检查生图模型名/接口是否支持生图。';
  }

  if (has(/OPENAI_COMPAT_IMAGES_NOT_SUPPORTED_ON_DASHSCOPE/i)) {
    return 'DashScope 不支持 OpenAI 生图接口 `/v1/images/generations`；请在“API 设置→配图”把生图接口类型切到“DashScope 万相”（Base URL 用 https://dashscope.aliyuncs.com，不要填 /api/v1），或改用你自己的后端 /v1/image。';
  }

  if (has(/DASHSCOPE_IMAGE_TIMEOUT/i)) {
    return 'DashScope 万相生图超时：可能是网络较慢或任务排队。请稍后重试，或换更短的提示词/更小尺寸。';
  }

  if (has(/DASHSCOPE_IMAGE_FAILED/i)) {
    const detail = rawMsg.includes(':') ? rawMsg.split(':').slice(1).join(':').trim() : '';
    return detail
      ? `DashScope 万相生图失败：${detail}（常见原因：万相模型名填错/Key 无权限或额度不足/内容审核拦截）。`
      : 'DashScope 万相生图失败：常见原因是万相模型名填错、Key 无权限/额度不足或内容审核拦截。请检查“API 设置→配图→万相模型名”。';
  }

  if (has(/DASHSCOPE_IMAGE_SUCCEEDED_BUT_EMPTY/i)) {
    return 'DashScope 万相任务返回成功但没有图片：请重试；若持续出现，请检查万相模型名/接口返回格式是否有变化。';
  }

  if (rawMsg.length > 240) return `${rawMsg.slice(0, 240)}…`;
  return rawMsg || '请稍后重试';
}
