import dotenv from 'dotenv';

// Load environment variables early
dotenv.config();

const clean = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  const match = /^["'](.*)["']$/.exec(trimmed);
  return match ? match[1] : trimmed;
};

export const env = {
  openaiKey: clean(process.env.OPENAI_API_KEY),
  geminiKey: clean(process.env.GOOGLE_GEMINI_API_KEY),
  kimiKey: clean(process.env.KIMI_API_KEY),
  kimiModel: clean(process.env.KIMI_MODEL),
  kimiBaseUrl: clean(process.env.KIMI_BASE_URL),
  provider: (() => {
    const val = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
    if (val === 'openai' || val === 'gemini' || val === 'kimi') return val;
    console.warn(`未知的 LLM_PROVIDER: ${val}，将使用 openai`);
    return 'openai';
  })(),
  port: Number(process.env.PORT || 8016)
};

export const assertEnv = () => {
  if (env.provider === 'openai' && !env.openaiKey) {
    throw new Error('OPENAI_API_KEY 未配置');
  }
  if (env.provider === 'gemini' && !env.geminiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY 未配置');
  }
  if (env.provider === 'kimi' && !env.kimiKey) {
    throw new Error('KIMI_API_KEY 未配置');
  }
};
