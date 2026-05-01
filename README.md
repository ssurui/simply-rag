# Simple RAG

用 Python 实现的简单 RAG（检索增强生成）示例项目，提供两种技术方案，可按需选用。

## 两种实现方案

### 方案一：use_ChromaDB

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

### 方案二：use_pgvector

使用 PostgreSQL + pgvector 作为向量数据库，Ollama bge-m3 进行嵌入，Ollama qwen3:8b 生成回答，提供 Gradio Web 界面。适合需要持久化存储、完全本地化运行的场景。

```
文档（Markdown）
    ↓
分块（500字符）→ Ollama bge-m3 向量化 → PostgreSQL（pgvector）
                                               ↓
用户提问 → 向量化 → 相似度检索（内积）
                                               ↓
                              Ollama qwen3:8b 流式生成回答
                                               ↓
                              Gradio Web 界面展示
```

## 项目结构

```
simple-rag/
├── requirements.txt
├── example/
│   └── sample.txt                     # 示例文档
├── docs/                              # 待索引文档
└── src/
    ├── use_ChromaDB/                  # 方案一：ChromaDB + Ollama
    │   ├── main.py                    # 命令行入口（index / query / run）
    │   ├── simple_ui.py               # Gradio Web 问答界面
    │   ├── loader.py                  # 文档加载与分块（TXT / Markdown / PDF）
    │   ├── embedder.py                # 文本向量化（Ollama bge-m3）
    │   ├── vectorstore.py             # 向量存储与检索（ChromaDB）
    │   ├── retriever.py               # 检索协调器
    │   └── generator.py              # 流式回答生成（Ollama qwen3:8b）
    └── use_pgvector/                  # 方案二：pgvector + Ollama
        ├── simple.py                  # 文档入库 & 向量查询
        └── rag_ui.py                  # Gradio Web 问答界面
```

## 快速开始

### 前置条件（两种方案均需要）

本地运行 Ollama，并拉取所需模型：

```bash
ollama pull bge-m3
ollama pull qwen3:8b
```

安装 Python 依赖：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

### 方案一：use_ChromaDB

所有命令在 `src/use_ChromaDB/` 目录下执行。

**第一步：文档入库（持久化到 ChromaDB）**

```bash
cd src/use_ChromaDB
python main.py index --docs ../../docs/ --persist ./chroma_db
```

**重新入库（清空旧数据）**

```bash
rm -rf ./chroma_db
python main.py index --docs ../../docs/ --persist ./chroma_db
```

**命令行问答**

```bash
python main.py query --query "你的问题" --persist ./chroma_db --top-k 5
```

**Web 界面问答**

```bash
python simple_ui.py
# 浏览器访问 http://localhost:7860
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

### 方案二：use_pgvector

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

**文档入库**

修改 `src/use_pgvector/simple.py` 末尾的 `file_path`，然后运行：

```bash
cd src/use_pgvector
python3 simple.py
```

**启动 Web 界面**

```bash
cd src/use_pgvector
python3 rag_ui.py
# 浏览器访问 http://localhost:7860
```

---

## 方案对比

| 对比项 | use_ChromaDB | use_pgvector |
|--------|-------------|-------------|
| 向量数据库 | ChromaDB（内嵌） | PostgreSQL + pgvector |
| 嵌入模型 | Ollama bge-m3 | Ollama bge-m3 |
| 生成模型 | Ollama qwen3:8b | Ollama qwen3:8b |
| 分块大小 | 500 字符 | 500 字符 |
| 流式输出 | 是 | 是 |
| 界面形式 | 命令行 + Gradio Web | Gradio Web |
| 数据持久化 | 可选 | 是 |
| 额外服务依赖 | 无 | PostgreSQL |

## 许可证

MIT License
