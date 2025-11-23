import { env } from '../config/env.js';
import { openaiProvider } from './openaiProvider.js';
import { geminiProvider } from './geminiProvider.js';
import { kimiProvider } from './kimiProvider.js';

const providerMap = {
  openai: openaiProvider,
  gemini: geminiProvider,
  kimi: kimiProvider
};

export const resolveProvider = (overrideProvider) => {
  const key = (overrideProvider || env.provider || 'openai').toLowerCase();
  const provider = providerMap[key];
  if (!provider) {
    throw new Error(`不支持的模型提供商: ${key}`);
  }
  return provider;
};

export const providers = providerMap;
