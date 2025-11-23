import OpenAI from 'openai';
import { env } from '../config/env.js';
import { buildGenerationPrompt, buildTranslationPrompt } from './prompts.js';
import { safeJsonParse } from '../utils/json.js';

let cachedClient;
const getClient = () => {
  if (!env.openaiKey) {
    throw new Error('OPENAI_API_KEY 未配置');
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: env.openaiKey,
      maxRetries: 3,
      timeout: 60_000
    });
  }
  return cachedClient;
};

const normalizeBullets = (payload) => {
  const bullets = payload?.bullet_points || payload?.bulletPoints || [];
  if (!Array.isArray(bullets)) return [];
  return bullets
    .map((item) => (typeof item === 'string' ? item.trim() : String(item || '')))
    .filter(Boolean);
};

export const openaiProvider = {
  name: 'openai',

  async generate({ productTitle, productImageBase64, platform }) {
    const client = getClient();
    const system = buildGenerationPrompt(platform);

    const user = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `产品标题: ${productTitle || '(未提供)'}`
        }
      ]
    };

    if (productImageBase64) {
      user.content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${productImageBase64}`,
          detail: 'high'
        }
      });
    }

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        user
      ]
    });

    const raw = completion.choices[0]?.message?.content || '';
    const parsed = safeJsonParse(raw);
    if (!parsed.ok) {
      throw new Error(`OpenAI 返回的 JSON 解析失败: ${parsed.error.message}`);
    }

    const bulletPoints = normalizeBullets(parsed.value);
    if (bulletPoints.length !== 5) {
      throw new Error(`OpenAI 返回的 bullet_points 数量异常: ${bulletPoints.length}`);
    }

    return {
      bullet_points: bulletPoints,
      language: parsed.value.language || parsed.value.lang || 'en-US',
      raw: parsed.value
    };
  },

  async translate({ contentArray, targetLanguage }) {
    const client = getClient();
    const system = buildTranslationPrompt(targetLanguage);

    const completion = await client.chat.completions.create({
      model: 'gpt-5.1',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: JSON.stringify({ content_array: contentArray })
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content || '';
    const parsed = safeJsonParse(raw);
    if (!parsed.ok) {
      throw new Error(`OpenAI 翻译结果解析失败: ${parsed.error.message}`);
    }

    const translated = parsed.value.translated_array || parsed.value.translatedArray;
    if (!Array.isArray(translated)) {
      throw new Error('OpenAI 翻译结果缺少 translated_array');
    }

    return { translated_array: translated, raw: parsed.value };
  }
};
