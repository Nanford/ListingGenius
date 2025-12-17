import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { buildGenerationPrompt, buildTranslationPrompt } from './prompts.js';
import { safeJsonParse } from '../utils/json.js';

const DEFAULT_GEMINI_MODEL_ID = 'gemini-3-pro-preview';
const GEMINI_FLASH_MODEL_ID = 'gemini-3-flash-preview';

let cachedGenAI;
const cachedModels = new Map();
const getModel = (modelId) => {
  if (!env.geminiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY 未配置');
  }
  if (!cachedGenAI) {
    cachedGenAI = new GoogleGenerativeAI(env.geminiKey);
  }

  const effectiveModelId = modelId === GEMINI_FLASH_MODEL_ID ? GEMINI_FLASH_MODEL_ID : DEFAULT_GEMINI_MODEL_ID;
  if (!cachedModels.has(effectiveModelId)) {
    cachedModels.set(effectiveModelId, cachedGenAI.getGenerativeModel({ model: effectiveModelId }));
  }
  return cachedModels.get(effectiveModelId);
};

const normalizeBullets = (payload) => {
  const bullets = payload?.bullet_points || payload?.bulletPoints || [];
  if (!Array.isArray(bullets)) return [];
  return bullets
    .map((item) => (typeof item === 'string' ? item.trim() : String(item || '')))
    .filter(Boolean);
};

const extractText = (response) => {
  try {
    return response?.response?.text?.() || response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch {
    return '';
  }
};

export const geminiProvider = {
  name: 'gemini',

  async generate({ productTitle, productImageBase64, platform, modelId }) {
    const model = getModel(modelId);
    const prompt = buildGenerationPrompt(platform);
    const parts = [
      { text: prompt },
      { text: `产品标题: ${productTitle || '(未提供)'}` }
    ];

    if (productImageBase64) {
      parts.push({ text: '商品图片：' });
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: productImageBase64
        }
      });
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: 'application/json'
      }
    });

    const raw = extractText(result);
    const parsed = safeJsonParse(raw);
    if (!parsed.ok) {
      throw new Error(`Gemini 返回的 JSON 解析失败: ${parsed.error.message}`);
    }

    const bulletPoints = normalizeBullets(parsed.value);
    if (bulletPoints.length !== 5) {
      throw new Error(`Gemini 返回的 bullet_points 数量异常: ${bulletPoints.length}`);
    }

    return {
      bullet_points: bulletPoints,
      language: parsed.value.language || parsed.value.lang || 'en-US',
      raw: parsed.value
    };
  },

  async translate({ contentArray, targetLanguage, modelId }) {
    const model = getModel(modelId);
    const prompt = buildTranslationPrompt(targetLanguage);
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { text: `待翻译数组: ${JSON.stringify(contentArray)}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });

    const raw = extractText(result);
    const parsed = safeJsonParse(raw);
    if (!parsed.ok) {
      throw new Error(`Gemini 翻译结果解析失败: ${parsed.error.message}`);
    }

    const translated = parsed.value.translated_array || parsed.value.translatedArray;
    if (!Array.isArray(translated)) {
      throw new Error('Gemini 翻译结果缺少 translated_array');
    }

    return { translated_array: translated, raw: parsed.value };
  }
};
