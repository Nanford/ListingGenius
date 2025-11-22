import express from 'express';
import { z } from 'zod';
import { resolveProvider } from '../providers/factory.js';
import { fetchImageAsBase64 } from '../utils/image.js';

const router = express.Router();

const generateSchema = z.object({
  prompt_context: z.object({
    title: z.string().trim().min(1, 'title 不能为空'),
    img_link: z.string().url().optional(),
    image_base64: z.string().optional()
  }),
  target_platform: z.enum(['AMAZON', 'EBAY']).default('AMAZON'),
  model_provider: z.enum(['openai', 'gemini']).optional()
});

const translateSchema = z.object({
  content_array: z.array(z.string().trim()).min(1, 'content_array 不能为空'),
  target_language: z.string().trim().min(1, 'target_language 不能为空'),
  model_provider: z.enum(['openai', 'gemini']).optional()
});

router.post('/generate', async (req, res) => {
  try {
    const parsed = generateSchema.parse(req.body);
    const provider = resolveProvider(parsed.model_provider);
    const platform = parsed.target_platform.toLowerCase(); // amazon | ebay

    let imageBase64 = parsed.prompt_context.image_base64;
    if (!imageBase64 && parsed.prompt_context.img_link) {
      imageBase64 = await fetchImageAsBase64(parsed.prompt_context.img_link);
    }

    const result = await provider.generate({
      productTitle: parsed.prompt_context.title,
      productImageBase64: imageBase64,
      platform
    });

    return res.json({
      code: 200,
      data: {
        bullet_points: result.bullet_points,
        language: result.language,
        provider: provider.name,
        raw: result.raw
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 400,
        message: '请求参数错误',
        details: error.flatten()
      });
    }
    console.error('[Generate] Error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || '生成失败'
    });
  }
});

router.post('/translate', async (req, res) => {
  try {
    const parsed = translateSchema.parse(req.body);
    const provider = resolveProvider(parsed.model_provider);

    const result = await provider.translate({
      contentArray: parsed.content_array,
      targetLanguage: parsed.target_language
    });

    return res.json({
      code: 200,
      data: {
        translated_array: result.translated_array,
        provider: provider.name,
        raw: result.raw
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 400,
        message: '请求参数错误',
        details: error.flatten()
      });
    }
    console.error('[Translate] Error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || '翻译失败'
    });
  }
});

export default router;
