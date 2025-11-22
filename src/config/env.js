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
  provider: (() => {
    const val = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
    if (val === 'openai' || val === 'gemini') return val;
    console.warn(`未知的 LLM_PROVIDER: ${val}，将使用 openai`);
    return 'openai';
  })(),
  port: Number(process.env.PORT || 3000)
};

export const assertEnv = () => {
  if (env.provider === 'openai' && !env.openaiKey) {
    throw new Error('OPENAI_API_KEY 未配置');
  }
  if (env.provider === 'gemini' && !env.geminiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY 未配置');
  }
};
