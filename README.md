# Simple RAG

用 Python 和 TypeScript 实现的本地化 RAG（检索增强生成）示例项目，提供三种技术方案，可按需选用。

## 三种实现方案

### 方案一：use_ChromaDB（Python）

使用 ChromaDB 作为向量数据库，Ollama bge-m3 进行本地嵌入，Ollama qwen3:8b 生成回答。提供命令行和 Gradio Web 两种使用方式，无需额外部署数据库服务。

```
文档（TXT / Markdown / PDF）
    ↓
分块（500字符）→ Ollama bge-m3 向量化 → ChromaDB 持久化
                                               ↓
用户提问 → 向量化 → 相似度检索（余弦）
                                               ↓
                              Ollama qwen3:8b 流式生成回答
```

### 方案二：use_pgvector（Python）

使用 PostgreSQL + pgvector 作为向量数据库，Ollama bge-m3 进行嵌入，Ollama qwen3:8b 生成回答，提供 Gradio Web 界面。

```
文档（Markdown）
    ↓
分块（500字符）→ Ollama bge-m3 向量化 → PostgreSQL（pgvector）
                                               ↓
用户提问 → 向量化 → 相似度检索（内积）
                                               ↓
                              Ollama qwen3:8b 流式生成 → Gradio Web 界面
```

### 方案三：web_app（Electron 桌面应用）

使用 Electron + Vite + Vue3 + TypeScript 构建的跨平台桌面应用，LanceDB 作为嵌入式向量数据库，支持 macOS / Windows / Linux。

```
文档（Markdown）
    ↓
分块（500字符）→ Ollama bge-m3 向量化 → LanceDB（本地）
                                               ↓
用户提问 → 向量化 → 相似度检索（余弦）
                                               ↓
                              Ollama qwen3:8b 流式生成 → Electron 界面（Markdown 渲染）
```

## 项目结构

```
simple-rag/
├── requirements.txt
├── docs/                              # 待索引文档（已加入 .gitignore）
└── src/
    ├── use_ChromaDB/                  # 方案一：ChromaDB + Ollama（Python）
    │   ├── main.py                    # 命令行入口（index / query / run）
    │   ├── simple_ui.py               # Gradio Web 问答界面
    │   ├── loader.py                  # 文档加载与分块
    │   ├── embedder.py                # 文本向量化（Ollama bge-m3）
    │   ├── vectorstore.py             # 向量存储与检索（ChromaDB）
    │   ├── retriever.py               # 检索协调器
    │   └── generator.py              # 流式回答生成（Ollama qwen3:8b）
    ├── use_pgvector/                  # 方案二：pgvector + Ollama（Python）
    │   ├── simple.py                  # 文档入库 & 向量查询
    │   └── rag_ui.py                  # Gradio Web 问答界面
    └── web_app/                       # 方案三：Electron 桌面应用（TypeScript）
        ├── package.json
        ├── electron.vite.config.ts
        ├── electron-builder.config.ts
        └── src/
            ├── main/                  # 主进程
            │   ├── index.ts           # 应用入口
            │   ├── config.ts          # 配置读写
            │   ├── ipc/               # IPC 处理器
            │   ├── rag/               # 分块、向量化、生成
            │   └── db/                # LanceDB 操作
            ├── preload/               # 预加载脚本（contextBridge）
            └── renderer/              # Vue3 渲染进程
                └── src/
                    ├── App.vue
                    ├── components/    # IndexPanel / ChatPanel / ContextDrawer / SettingsModal
                    ├── stores/        # Pinia 状态管理
                    └── types/         # TypeScript 类型定义
```

## 快速开始

### 前置条件（所有方案均需要）

本地运行 Ollama，并拉取所需模型：

```bash
ollama pull bge-m3
ollama pull qwen3:8b
```

---

### 方案一：use_ChromaDB（Python）

```bash
# 安装依赖
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 文档入库
cd src/use_ChromaDB
python main.py index --docs ../../docs/ --persist ./chroma_db

# 命令行问答
python main.py query --query "你的问题" --persist ./chroma_db --top-k 5

# Web 界面
python simple_ui.py
# 访问 http://localhost:7860
```

| 子命令 | 参数 | 说明 |
|--------|------|------|
| `index` | `--docs` | 文档路径（文件或目录） |
| `index` | `--persist` | 向量库目录（默认 `./chroma_db`） |
| `query` | `--query` | 用户问题 |
| `query` | `--persist` | 向量库目录（默认 `./chroma_db`） |
| `query` | `--top-k` | 检索片段数量（默认 5） |
| `run`   | `--docs` `--query` | 一次性完成入库+查询 |

---

### 方案二：use_pgvector（Python）

**数据库初始化**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE simple_rag (
    id          SERIAL PRIMARY KEY,
    source      TEXT,
    chunk_id    TEXT,
    start_index INTEGER,
    end_index   INTEGER,
    content     TEXT,
    embedding   vector(1024),
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);
```

```bash
# 文档入库
cd src/use_pgvector
python3 simple.py

# 启动 Web 界面
python3 rag_ui.py
# 访问 http://localhost:7860
```

---

### 方案三：web_app（Electron 桌面应用）

```bash
cd src/web_app
npm install

# 开发模式
npm run dev

# 打包
npm run package:mac    # macOS
npm run package:win    # Windows
npm run package:linux  # Linux
```

启动后：
1. 点击左侧「选择文件」或「选择目录」，选择 Markdown 文档
2. 选择入库方式（追加 / 清空重建），点击「开始入库」
3. 入库完成后在右侧输入问题，按 Enter 发送
4. 点击「查看检索片段」可查看每次查询的原始上下文

**设置**：点击右上角「设置」按钮可分别配置嵌入模型服务地址和生成模型服务地址，支持两类模型部署在不同机器上。

**数据存储位置**：

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/simple-rag-app/` |
| Windows | `%APPDATA%\simple-rag-app\` |
| Linux | `~/.config/simple-rag-app/` |

**开发注意**：退出 `npm run dev` 后若终端显示异常，运行 `printf '\e[?2004l'; stty sane` 恢复。

---

## 方案对比

| 对比项 | use_ChromaDB | use_pgvector | web_app |
|--------|-------------|-------------|---------|
| 语言 | Python | Python | TypeScript |
| 向量数据库 | ChromaDB（内嵌） | PostgreSQL + pgvector | LanceDB（内嵌） |
| 嵌入模型 | Ollama bge-m3 | Ollama bge-m3 | Ollama bge-m3 |
| 生成模型 | Ollama qwen3:8b | Ollama qwen3:8b | Ollama qwen3:8b |
| 分块大小 | 500 字符 | 500 字符 | 500 字符 |
| 流式输出 | 是 | 是 | 是 |
| 界面形式 | 命令行 + Gradio Web | Gradio Web | Electron 桌面 |
| 额外服务依赖 | 无 | PostgreSQL | 无 |
| 跨平台打包 | 否 | 否 | 是 |

## 许可证

MIT License
