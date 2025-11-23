# ListingGenius 应用部署指南 (Debian Server)

本指南详细介绍了如何在 Debian 服务器上部署 ListingGenius 全栈应用。我们推荐使用 **Nginx** 作为反向代理和静态文件服务，**PM2** 用于守护 Node.js 后端进程。

**假设项目根目录位于 `/path/to/ListingGenius` (请根据你的实际情况替换此路径)。**
**你的域名是 `listing.leenf.online`。**

---

## 第一步：安装系统环境 (Node.js & Nginx)

Debian 默认源的 Node.js 版本通常较旧，建议安装 Node.js LTS (长期支持) 版本（例如 v18 或 v20）。

1.  **更新系统并安装必要的工具**
    ```bash
    sudo apt update
    sudo apt install -y curl git nginx
    ```

2.  **添加 NodeSource 仓库 (以 Node.js 20 为例)**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    ```

3.  **安装 Node.js**
    ```bash
    sudo apt install -y nodejs
    ```

4.  **安装 PM2 (用于在后台运行 Node 服务并进行进程守护)**
    ```bash
    sudo npm install -g pm2
    ```

---

## 第二步：配置后端 (Backend)

1.  **进入项目根目录并安装后端依赖**
    ```bash
    cd /path/to/ListingGenius # 替换为你的实际项目路径
    npm install
    ```

2.  **配置环境变量**
    复制示例配置文件 `.env.example` 到 `.env`，并编辑 `.env` 文件，填入你的 OpenAI 或 Gemini API Key。同时，确认或设置 `PORT` 变量（例如 `PORT=3000`）。
    ```bash
    cp .env.example .env
    nano .env
    ```
    *在 `nano` 编辑器中，填入你的 API KEY 和端口。按 `Ctrl+O` 保存，`Ctrl+X` 退出。*

3.  **使用 PM2 启动后端服务**
    ```bash
    pm2 start src/server.js --name "listing-genius-api"
    ```
    *这会以后台进程方式启动 Node.js 服务器。*

4.  **配置 PM2 开机自启 (可选但强烈推荐)**
    ```bash
    pm2 startup # 根据提示执行输出的命令 (例如 sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u your_username --hp /home/your_username)
    pm2 save
    ```
    *`your_username` 替换为你服务器上的实际用户名。*

---

## 第三步：构建前端 (Frontend)

React 应用需要构建成静态文件，以便 Nginx 可以直接提供服务。

1.  **进入前端目录并安装前端依赖**
    ```bash
    cd /path/to/ListingGenius/frontend # 替换为你的实际项目路径
    npm install
    ```

2.  **构建生产环境的前端代码**
    ```bash
    npm run build
    ```
    *构建完成后，会在 `frontend/` 目录下生成一个 `dist` 文件夹，其中包含所有静态文件。*

---

## 第四步：配置 Nginx (反向代理和静态文件服务)

Nginx 将直接提供前端的静态文件，并将所有 `/api` 开头的请求转发到 Node.js 后端服务。

1.  **创建 Nginx 配置文件**
    ```bash
    sudo nano /etc/nginx/sites-available/listing-genius
    ```

2.  **粘贴以下内容到文件中，并保存**：
    *   **重要**：请将 `root` 路径 `/path/to/ListingGenius/frontend/dist` 替换为你的前端 `dist` 目录的实际绝对路径。
    *   `server_name` 已设置为你的域名 `listing.leenf.online`。

    ```nginx
    server {
        listen 80;
        server_name listing.leenf.online; # 你的域名

        # 1. 前端静态文件服务配置
        location / {
            # **!!! 替换为你的前端 dist 目录的绝对路径 !!!**
            root /path/to/ListingGenius/frontend/dist; 
            index index.html;
            
            # 针对单页应用 (SPA) 的路由配置，确保刷新页面不会出现 404 错误
            try_files $uri $uri/ /index.html;
        }

        # 2. 后端 API 反向代理配置
        location /api {
            # 转发到 Node.js 后端端口 (根据 .env 文件中的 PORT 设置，默认为 3000)
            proxy_pass http://localhost:3000;
            
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **激活 Nginx 配置并重启服务**
    ```bash
    # 移除可能存在的默认配置 (如果需要)
    # sudo rm /etc/nginx/sites-enabled/default 

    # 建立软链接，激活新的配置
    sudo ln -s /etc/nginx/sites-available/listing-genius /etc/nginx/sites-enabled/

    # 检查 Nginx 配置文件的语法是否正确
    sudo nginx -t

    # 如果显示 "syntax is ok" 和 "test is successful"，则重启 Nginx 服务
    sudo systemctl restart nginx
    ```

---

## 第五步：验证部署

1.  **在浏览器中访问你的域名：`http://listing.leenf.online`**
    *   你应该能看到 ListingGenius 的前端界面。

2.  **测试应用功能**
    *   尝试输入商品标题或上传图片，点击生成文案，确保后端 API 调用正常工作。
    *   如果遇到问题，请检查后端和 Nginx 的日志。

---

## 常用维护命令

*   **查看后端日志:** `pm2 logs listing-genius-api`
*   **重启后端服务:** `pm2 restart listing-genius-api`
*   **停止后端服务:** `pm2 stop listing-genius-api`
*   **删除后端服务 (从 PM2 列表移除):** `pm2 delete listing-genius-api`

*   **更新代码后 (以 `git pull` 为例):**
    1.  进入项目根目录：`cd /path/to/ListingGenius`
    2.  拉取最新代码：`git pull`
    3.  **如果后端代码有变动 (例如新增依赖、修改逻辑):**
        *   安装新依赖：`npm install`
        *   重启后端服务：`pm2 restart listing-genius-api`
    4.  **如果前端代码有变动 (例如修改 UI、添加功能):**
        *   进入前端目录：`cd frontend`
        *   安装新依赖：`npm install`
        *   重新构建前端：`npm run build`
        *   *Nginx 不需要重启，浏览器刷新即可看到最新变化。*

---