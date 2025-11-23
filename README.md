# ListingGenius (AI-Powered Listing Generator)

跨境电商 Listing 文案智能生成与翻译工具，专为 Amazon/eBay 运营打造。集成 OpenAI (GPT-4o) 与 Google Gemini Pro 多模态大模型，实现从商品标题/图片一键生成高质量 5 点描述，并支持可视化多语言对照翻译。

![ListingGenius UI](./doc/screenshot.png) *(Placeholder for screenshot)*

## 核心特性 (Key Features)

- **AI 智能生成:** 基于 Gemini Vision / GPT-4o 多模态能力，输入标题或图片即可生成符合 Amazon/eBay SEO 规范的 5 点描述。
- **对照式翻译:** 创新性的“原文/译文”双栏对照模式，支持一键翻译成德/法/意/西/日等主流语种，修改译文时不影响原文。
- **极致 UI 设计:** 采用 Apple-style 极简设计语言，毛玻璃特效 Navbar、胶囊按钮与柔和阴影，完美适配 1920x1080 大屏工作流。
- **本地化暂存:** 生成结果自动支持 LocalStorage 持久化，防止意外刷新丢失；支持草稿箱管理与批量导出。
- **多模型切换:** 支持在界面实时切换 OpenAI 与 Gemini 模型，灵活应对不同场景需求。
- **标准化导出:** 一键导出包含原文、译文、图片链接的标准 CSV 文件，可直接用于后续上架流程。

## 技术栈 (Tech Stack)

- **Backend:** Node.js + Express
  - `openai`: OpenAI 官方 SDK
  - `@google/generative-ai`: Google Gemini SDK
  - `zod`: 严格的运行时参数校验
- **Frontend:** React + TypeScript + Vite
  - `lucide-react`: 现代图标库
  - Custom CSS Variables: 实现了完整的 Apple 风格设计系统

## 快速开始 (Getting Started)

### 1. 环境配置
在根目录创建 `.env` 文件：
```bash
OPENAI_API_KEY=sk-proj-...
GOOGLE_GEMINI_API_KEY=AIzaSy...
PORT=3000
LLM_PROVIDER=gemini # 默认模型提供商
```

### 2. 安装与启动

**开发模式 (Development):**

```bash
# 1. 启动后端服务
npm install
npm run dev

# 2. 启动前端服务 (新终端窗口)
cd frontend
npm install
npm run dev
```
访问前端地址: `http://localhost:5173`

**生产构建 (Production):**

```bash
# 构建前端并由后端托管
cd frontend && npm run build
cd ..
npm start
```
访问服务地址: `http://localhost:3000`

## API 文档

### 生成文案 (Generate)
`POST /api/v1/listing/generate`

```json
{
  "prompt_context": {
    "title": "Anker Soundcore Life Q20",
    "img_link": "https://example.com/product.jpg"
  },
  "target_platform": "AMAZON",
  "model_provider": "gemini"
}
```

### 翻译内容 (Translate)
`POST /api/v1/listing/translate`

```json
{
  "content_array": ["High-Resolution Audio...", "Hybrid Active Noise Cancelling..."],
  "target_language": "de",
  "model_provider": "openai"
}
```

## 数据导出格式

导出的 CSV 包含以下字段：
- `title`: 商品原标题
- `point1` - `point5`: 原始 5 点描述
- `trans_point1` - `trans_point5`: 翻译后的 5 点描述
- `img-link`: 图片链接
- `platform`: 适用平台
- `language`: 原文语言代码
- `trans_language`: 译文语言代码

## 目录结构

```
ListingGenius/
├── src/                  # 后端源码
│   ├── providers/        # LLM 接口封装 (Factory Pattern)
│   ├── routes/           # Express 路由
│   └── server.js         # 入口文件
├── frontend/             # 前端源码
│   ├── src/
│   │   ├── App.tsx       # 核心业务组件
│   │   ├── App.css       # 布局与组件样式
│   │   └── index.css     # 全局变量与设计系统
│   └── vite.config.ts    # 构建配置
└── README.md
```