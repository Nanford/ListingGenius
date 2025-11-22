# ListingGenius

基于 `ListingGenius_DevSpec.md` 的梳理，描述本工具的目标、功能和建议的技术栈，供开发前确认。

## 项目目标

- 面向 Amazon/eBay 等跨境电商团队，提供“输入即文案”的自动化工具。
- 通过 Gemini/OpenAI 多模态模型，10 秒内生成符合平台 SEO 规则的 5 点描述。
- 支持图片/标题输入、多语言翻译、批量暂存与导出，替代人工复制粘贴流程。

## 主要功能

- 文案生成：输入商品标题或图片，调用 Gemini Vision / GPT-4o 生成 5 点描述（强制 JSON 结构，长度校验与自动重试）。
- 文案校验与编辑：前端呈现 5 点描述，支持手工微调；格式异常时提示并可重试。
- 多语言翻译：可选择目标语言，调用翻译接口覆盖或并列显示，翻译前弹框确认以防覆盖风险。
- 状态管理：INIT → GENERATING → REVIEW_PENDING → (TRANSLATING) → STAGED → ARCHIVED，错误流转至 ERROR。
- 暂存与会话恢复：确认后写入前端 `Staging_Table`/Session，并同步 localStorage，浏览器刷新后恢复未导出的草稿。
- 导出交付：将暂存列表序列化为 CSV/XLSX，列映射包含 title、point1-5、img-link。
- 异常处理：AI 少点/多点自动重试一次并给出错误提示；图片不可读时提示更换；翻译覆盖风险提示。

## 数据结构要点

- Listing_Item_Draft：`id`、`source_title`、`img_link`、`bullet_points[5]`、`language_code`、`platform`(`AMAZON|EBAY`)、`status`、`created_at`。
- 导出字段映射：`title` → `source_title`，`point1-5` → `bullet_points[0-4]`，`img-link` → `img_link`。

## API 草案

- POST `/api/v1/listing/generate`：传入标题/图片、平台、模型提供方，返回 5 点描述与语言。
- POST `/api/v1/listing/translate`：传入内容数组与目标语言，返回翻译结果数组。

## 建议技术栈

- 前端：React + TypeScript（Vite 或 Next.js App Router），状态管理（Zustand/Jotai），表格与交互组件（Ant Design 或 Mantine），导出工具（SheetJS/CSV 库），localStorage 持久化。
- 后端：Node.js + TypeScript（Next.js API Route 或 Express/Fastify），调用 OpenAI 与 Google Gemini SDK，内置格式校验与重试中间件。
- 通信与安全：HTTPS，环境变量管理（`OPENAI_API_KEY`、`GEMINI_API_KEY`），可选 Rate Limit 与请求签名。
- 测试与质量：Playwright/Cypress 做生成与翻译流程的端到端冒烟，Vitest/Jest 做格式校验与状态机单测，ESLint + Prettier + TypeScript 严格模式。

## 预期开发拆分

- 核心流程：生成 → 编辑/翻译 → 暂存 → 导出。
- 关键组件：输入表单（标题/图片）、生成结果卡片、翻译确认模态、暂存表格、导出控制器、错误提示。
- 配置与运维：API Key 配置、模型选择开关、平台 Prompt 模板管理、日志与简单监控。

确认无误后，可据此初始化工程与目录结构，再按模块迭代开发。
