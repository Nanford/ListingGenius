## 1. 功能概述 (Overview)

本工具旨在解决跨境电商（Amazon/eBay）运营团队在Listing创建过程中“文案撰写耗时久”与“多语言翻译繁琐”的痛点。通过集成 Gemini/OpenAI 多模态大模型能力，实现“输入即文案”的自动化流程。

**核心价值：**

1. **提效 (Efficiency):** 将原本耗时 20-30 分钟的五点描述（Bullet Points）撰写缩短至 10 秒。
    
2. **标准化 (Standardization):** 强制输出符合平台SEO规则的高质量结构化数据。
    
3. **批处理流 (Batch Workflow):** 引入“生成-清洗-暂存-导出”的工作流，替代传统的“复制-粘贴-Excel”低效模式。
    

## 2. 核心逻辑流程 (Core Logic)

### 2.1. 前置条件 (Prerequisites)

- 系统已配置有效的 OpenAI API Key 或 Google Gemini API Key。
    
- 用户已选择目标平台（Amazon/eBay）以加载对应的 Prompt Template（提示词模板）。
    

### 2.2. 业务流程 (Business Workflow)

1. **输入阶段:** 用户输入 `product_title` (文本) 或上传 `product_image`。
    
2. **生成阶段 (AI Processing):**
    
    - 后端组装 System Prompt，强制要求 JSON 格式输出 5 个独立的卖点。
        
    - 调用 LLM API (Gemini Vision 或 GPT-4o)。
        
3. **审查与编辑阶段 (Review & Edit):**
    
    - 前端展示生成的 5 点描述。
        
    - **分支流程 (可选):** 用户点击“翻译”，选择目标语言 -> 调用翻译接口 -> 覆盖/并列显示结果。
        
    - 用户手动微调内容。
        
4. **确认暂存 (Commit to Staging):**
    
    - 用户点击“确认”。
        
    - 系统校验数据完整性（5点均非空）。
        
    - 数据被推入前端 `Staging_Table` (暂存表) 或后端 Session 缓存。
        
    - 输入框清空，准备下一次生成。
        
5. **导出交付 (Export):**
    
    - 用户点击“下载”。
        
    - 系统将 `Staging_Table` 中的所有行序列化为 CSV/XLSX 文件并触发浏览器下载。
        

## 3. 数据模型 (Data Schema)

由于这是一个基于会话的工具，核心数据结构主要存在于前端状态管理（Store）或后端临时 Session 中。

### 3.1. 单条Listing对象 (Listing_Item_Draft)

用于前端展示及暂存列表的数据结构。

|**Field Name**|**Type**|**Required**|**Description**|**Note**|
|---|---|---|---|---|
|`id`|UUID|Y|唯一标识符|用于前端列表渲染 Key|
|`source_title`|String|N|用户输入的原始标题|若仅传图则可能为空|
|`img_link`|String|N|图片URL|本地上传需转为临时访问链接|
|`bullet_points`|Array<String>|Y|5点描述数组|必须包含且仅包含5个元素|
|`language_code`|String|Y|当前内容的语言|e.g., 'en-US', 'de-DE'|
|`platform`|Enum|Y|目标平台|`AMAZON`, `EBAY`|
|`status`|Enum|Y|当前条目状态|见状态机定义|
|`created_at`|Timestamp|Y|生成时间||

### 3.2. 导出文件结构 (Export Schema)

对应 .csv/.xlsx 的列头定义。

|**Column Header**|**Mapping Logic**|
|---|---|
|`title`|`Listing_Item_Draft.source_title`|
|`point1`|`Listing_Item_Draft.bullet_points[0]`|
|`point2`|`Listing_Item_Draft.bullet_points[1]`|
|`point3`|`Listing_Item_Draft.bullet_points[2]`|
|`point4`|`Listing_Item_Draft.bullet_points[3]`|
|`point5`|`Listing_Item_Draft.bullet_points[4]`|
|`img-link`|`Listing_Item_Draft.img_link`|

## 4. 状态机定义 (State Machine)

**实体：Listing_Item (单条商品文案)**

- **State: `INIT` (初始态)**
    
    - _Trigger:_ 用户输入标题或图片 -> _Action:_ `submit_generation()`
        
    - _Next State:_ `GENERATING`
        
- **State: `GENERATING` (生成中)**
    
    - _Trigger:_ API 成功响应 -> _Action:_ `render_result()`
        
    - _Next State:_ `REVIEW_PENDING`
        
    - _Trigger:_ API 失败 -> _Action:_ `show_error()`
        
    - _Next State:_ `ERROR`
        
- **State: `REVIEW_PENDING` (待审查/编辑)**
    
    - _Trigger:_ 用户修改文本 -> _Action:_ `update_draft()`
        
    - _Next State:_ `REVIEW_PENDING` (自身流转)
        
    - _Trigger:_ 用户点击翻译 -> _Action:_ `request_translation()`
        
    - _Next State:_ `TRANSLATING`
        
    - _Trigger:_ 用户点击确认 -> _Action:_ `commit_to_table()`
        
    - _Next State:_ `STAGED`
        
- **State: `TRANSLATING` (翻译中)**
    
    - _Trigger:_ 翻译完成 -> _Action:_ `update_draft_language()`
        
    - _Next State:_ `REVIEW_PENDING`
        
- **State: `STAGED` (已暂存)**
    
    - _Trigger:_ 用户点击下载 -> _Action:_ `export_file()`
        
    - _Next State:_ `ARCHIVED` (导出后不清空，但标记为已导出)
        

## 5. 异常处理与边界情况 (Error Handling)

### Case 1: AI 输出格式幻觉 (Hallucination)

- **场景:** LLM 未返回 5 点，而是返回了一段话或 3 点。
    
- **处理逻辑:**
    
    - 后端中间件校验 `bullet_points` 数组长度。
        
    - 若 `len != 5`，自动触发一次 Retry (最大重试次数: 1)。
        
    - 若重试失败，返回 Error Code `502 BAD_GATEWAY`，前端提示“AI生成格式异常，请手动拆分或重试”。
        

### Case 2: 图片链接失效或无法访问

- **场景:** 用户提供的 `img-link` 无法被 Gemini Vision 抓取。
    
- **处理逻辑:**
    
    - 捕获 API 抛出的 `400 INVALID_IMAGE`。
        
    - 前端提示用户：“图片无法识别，请尝试直接上传文件或更换链接”。
        

### Case 3: 浏览器意外刷新 (Data Persistence)

- **场景:** 用户已生成 10 条内容，但在第 11 条时刷新了页面。
    
- **处理逻辑:**
    
    - 前端必须实现 `localStorage` 机制。
        
    - 每次进入 `STAGED` 状态时，同步写入 `localStorage.getItem('draft_session')`。
        
    - 页面加载时检查是否有未导出的草稿并恢复。
        

### Case 4: 翻译覆盖风险

- **场景:** 用户在英文版修改了第3点，然后点击翻译成德语。
    
- **处理逻辑:**
    
    - UI 需弹出模态框确认：“翻译将覆盖当前编辑框内容，是否继续？”
        
    - 建议实现“双语对照”模式或提供“撤销”功能。
        

## 6. 接口定义建议 (API Suggestions)

### 6.1. 生成文案 (Generate Bullets)

- **Endpoint:** `POST /api/v1/listing/generate`
    
- **Request Body:**
    
    JSON
    
    ```
    {
      "prompt_context": {
        "title": "Wireless Bluetooth Headphones, Noise Cancelling",
        "img_link": "https://example.com/img.jpg"
      },
      "target_platform": "AMAZON", // 决定Prompt的风格
      "model_provider": "GEMINI" // or "OPENAI"
    }
    ```
    
- **Response:**
    
    JSON
    
    ```
    {
      "code": 200,
      "data": {
        "bullet_points": [
          "Point 1 content...",
          "Point 2 content...",
          "Point 3 content...",
          "Point 4 content...",
          "Point 5 content..."
        ],
        "language": "en-US"
      }
    }
    ```
    

### 6.2. 翻译内容 (Translate Content)

- **Endpoint:** `POST /api/v1/listing/translate`
    
- **Request Body:**
    
    JSON
    
    ```
    {
      "content_array": ["Point 1...", "Point 2..."],
      "target_language": "de", // ISO 639-1 code
      "context": "E-commerce product description" // 提供给LLM的上下文
    }
    ```
    
- **Response:**
    
    JSON
    
    ```
    {
      "code": 200,
      "data": {
        "translated_array": ["Punkt 1...", "Punkt 2..."]
      }
    }
    ```