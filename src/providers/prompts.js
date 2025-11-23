const platformGuidelines = {
  amazon: '遵守 Amazon Listing 规范：标题含核心关键词，五点描述突出卖点与规格，避免夸大与违规描述，保持简洁和可搜索性。',
  ebay: '遵守 eBay Listing 规范：标题≤80字符，突出关键词与硬信息；卖点用主动语态，避免夸大、不含联系方式或外链。'
};

export const buildGenerationPrompt = (platform = 'amazon') => {
  const guide = platformGuidelines[platform] || platformGuidelines.amazon;
  return [
    '你是一名跨境电商文案专家，擅长 Amazon/eBay SEO 友好写作。',
    guide,
    '输入包含产品标题及可选图片要素，请输出严格的 JSON：',
    '{',
    '  "bullet_points": ["Point1", "Point2", "Point3", "Point4", "Point5"],',
    '  "language": "bcp47 语言代码，如 en-US 或 de-DE"',
    '}',
    '要求：',
    '- bullet_points 必须且只返回 5 条，每条 尽可能的详细，且能突出产品卖点，可直接上架。',
    '- 结合图片信息（若提供）补全材质/尺寸/适用场景等硬信息；缺失时可合理推断但不虚构。',
    '- 仅返回 JSON 对象文本，不要 Markdown/说明/额外引号。'
  ].join('\n');
};

export const buildTranslationPrompt = (targetLanguage) => {
  return [
    '你是电商文案翻译专家，保持营销语气与关键信息准确。',
    `将输入数组翻译为 ${targetLanguage}，输出 JSON：`,
    '{',
    '  "translated_array": ["..."]',
    '}',
    '要求：',
    '- 保持数组长度与顺序不变，仅翻译文本内容。',
    '- 不添加 Markdown 或说明文字。',
    '- 保留专有名词/品牌名，数字与单位不修改。'
  ].join('\n');
};
