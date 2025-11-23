import { buildGenerationPrompt, buildTranslationPrompt } from './prompts.js';
import { safeJsonParse } from '../utils/json.js';
import { env } from '../config/env.js';

const KIMI_API_URL = env.kimiBaseUrl || 'https://api.moonshot.cn/v1/chat/completions';
const DEFAULT_MODEL = env.kimiModel || 'kimi-k2-turbo-preview';

const normalizeBullets = (payload) => {
  const bullets = payload?.bullet_points || payload?.bulletPoints || [];
  if (!Array.isArray(bullets)) return [];
  return bullets
    .map((item) => (typeof item === 'string' ? item.trim() : String(item || '')))
    .filter(Boolean);
};

const postKimi = async (body) => {
  const res = await fetch(KIMI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.kimiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kimi API 请求失败: ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
};

export const kimiProvider = {
  name: 'kimi',

  async generate({ productTitle, productImageBase64, platform }) {
    const prompt = buildGenerationPrompt(platform);
    const userContent = [`产品标题: ${productTitle || '(未提供)'}`];

    // 当前 Kimi 文本接口不支持图片，将图片提示写入文本，避免上传 base64 过大导致失败
    if (productImageBase64) {
      userContent.push('已上传商品图片（当前模型不解析图片，请基于标题与通用逻辑生成）。');
    }

    const completion = await postKimi({
      model: DEFAULT_MODEL,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userContent.join('\n') }
      ]
    });

    const raw = completion?.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(raw);
    if (!parsed.ok) {
      throw new Error(`Kimi 返回 JSON 解析失败: ${parsed.error.message}`);
    }

    const bulletPoints = normalizeBullets(parsed.value);
    if (bulletPoints.length !== 5) {
      throw new Error(`Kimi 返回 bullet_points 数量异常: ${bulletPoints.length}`);
    }

    return {
      bullet_points: bulletPoints,
      language: parsed.value.language || parsed.value.lang || 'zh-CN',
      raw: parsed.value
    };
  },

  async translate({ contentArray, targetLanguage }) {
    const prompt = buildTranslationPrompt(targetLanguage);

    const completion = await postKimi({
      model: DEFAULT_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: JSON.stringify({ content_array: contentArray })
        }
      ]
    });

    const raw = completion?.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(raw);
    if (!parsed.ok) {
      throw new Error(`Kimi 翻译结果解析失败: ${parsed.error.message}`);
    }

    const translated = parsed.value.translated_array || parsed.value.translatedArray;
    if (!Array.isArray(translated)) {
      throw new Error('Kimi 翻译结果缺少 translated_array');
    }

    return { translated_array: translated, raw: parsed.value };
  }
};
