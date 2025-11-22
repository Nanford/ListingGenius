import { env } from '../config/env.js';
import { openaiProvider } from './openaiProvider.js';
import { geminiProvider } from './geminiProvider.js';

const providerMap = {
  openai: openaiProvider,
  gemini: geminiProvider
};

export const resolveProvider = (overrideProvider) => {
  const key = (overrideProvider || env.provider || 'openai').toLowerCase();
  const provider = providerMap[key];
  if (!provider) {
    throw new Error(`不支持的模型提供方: ${key}`);
  }
  return provider;
};

export const providers = providerMap;
