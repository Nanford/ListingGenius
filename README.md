# ListingGenius

跨境电商 Listing 文案生成与翻译工具，支持 Amazon/eBay，集成 OpenAI 与 Gemini，可生成 5 点描述、翻译、暂存与导出。

## 特性

- 输入标题/图片，调用 LLM（OpenAI/Gemini）生成 5 点描述，强制 JSON 校验。
- 编辑与翻译：前端可修改卖点，选择语言翻译（覆盖模式，带确认）。
- 暂存与恢复：写入 localStorage，页面刷新后仍可恢复；支持删除。
- 导出：按 `title/point1-5/img-link` 映射导出 CSV。
- 模型切换：`.env` 中设置 `LLM_PROVIDER`，也可在请求体 `model_provider` 覆盖。

## 技术栈

- 后端：Node.js + Express + OpenAI SDK + @google/generative-ai + Zod。
- 前端：Vite + React + TypeScript，原生 fetch，CSV 导出（原生 Blob）。

## 环境变量

根目录 `.env`（参见 `.env.example`）：

- `OPENAI_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `LLM_PROVIDER=openai|gemini`（默认 openai，可被请求体覆盖）
- `PORT`（默认 3000）

前端 `.env`（参见 `frontend/.env.example`）：

- `VITE_API_BASE=http://localhost:3000`

## 启动

```bash
npm install
npm run dev          # 启动后端（默认 3000）

# 另开终端启动前端开发模式（Vite）
cd frontend
npm install
npm run dev          # Vite DevServer，默认 5173，已代理到后端需手动设置 VITE_API_BASE
```

或构建前端并由 Express 静态托管：

```bash
cd frontend && npm run build
cd ..
npm run start        # 会自动服务 frontend/dist 静态文件
```

健康检查：`curl http://localhost:3000/health`

## API

- `POST /api/v1/listing/generate`
  ```json
  {
    "prompt_context": {
      "title": "Wireless Bluetooth Headphones",
      "img_link": "https://example.com/img.jpg",
      "image_base64": "..."      // 可选
    },
    "target_platform": "AMAZON", // or EBAY
    "model_provider": "openai"   // or gemini，可选
  }
  ```
- `POST /api/v1/listing/translate`
  ```json
  {
    "content_array": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
    "target_language": "de",
    "model_provider": "gemini"
  }
  ```

## 前端使用（功能点）

- 输入区：标题、图片 URL、图片上传、平台选择、模型选择。
- 生成：调用 `/generate`，填充 5 点描述并显示语言。
- 编辑：可直接修改每条卖点。
- 翻译：选择目标语言，确认后覆盖当前内容。
- 暂存：保存当前标题+卖点至列表（localStorage 持久化）。
- 导出：点击「导出 CSV」生成 `listing_export.csv`。

## 目录

- `src/` 后端代码（Express、路由、LLM provider）
- `frontend/` 前端 Vite+React 应用
- `.env.example` 后端环境变量示例
- `frontend/.env.example` 前端环境变量示例
